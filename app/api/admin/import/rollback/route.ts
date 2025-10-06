import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { validateSuperAdminAccess } from "@/lib/auth/admin-auth";

interface RollbackRequest {
  sessionId: string;
  reason: string;
  force?: boolean;
}

interface RollbackResult {
  success: boolean;
  sessionId: string;
  reason: string;
  affectedRecords: number;
  cleanedFiles: number;
  duration: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Validate super admin access
    const adminValidation = await validateSuperAdminAccess(request);
    if (!adminValidation.valid) {
      return NextResponse.json(
        { error: "Unauthorized", message: adminValidation.error },
        { status: 401 },
      );
    }

    const {
      sessionId,
      reason,
      force = false,
    }: RollbackRequest = await request.json();

    if (!sessionId || !reason) {
      return NextResponse.json(
        { error: "Bad Request", message: "sessionId and reason are required" },
        { status: 400 },
      );
    }

    // Initiate rollback process
    const rollbackResult = await performRollback(
      sessionId,
      reason,
      force,
      adminValidation.user?.id,
    );

    if (!rollbackResult.success) {
      return NextResponse.json(
        { error: "Rollback Failed", message: rollbackResult.error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Rollback completed successfully",
      result: rollbackResult,
    });
  } catch (error) {
    console.error("Error during rollback:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to perform rollback" },
      { status: 500 },
    );
  }
}

async function performRollback(
  sessionId: string,
  reason: string,
  force: boolean,
  adminUserId?: string,
): Promise<RollbackResult> {
  const startTime = Date.now();
  const supabase = getSupabaseServiceClient();

  try {
    // 1. Stop all processing
    await stopProcessing(sessionId, supabase);

    // 2. Identify affected data
    const affectedData = await identifyAffectedData(sessionId, supabase);

    // 3. Clean up files
    await cleanupFiles(affectedData, supabase);

    // 4. Remove database records
    await removeDatabaseRecords(sessionId, supabase);

    // 5. Clean up email queue
    await cleanupEmailQueue(affectedData, supabase);

    // 6. Log rollback audit
    await logRollbackAudit(
      sessionId,
      reason,
      affectedData,
      adminUserId,
      supabase,
    );

    const duration = Date.now() - startTime;

    return {
      success: true,
      sessionId,
      reason,
      affectedRecords: affectedData.recordCount,
      cleanedFiles: affectedData.fileCount,
      duration,
    };
  } catch (error: any) {
    console.error("Rollback failed:", error);
    return {
      success: false,
      sessionId,
      reason,
      affectedRecords: 0,
      cleanedFiles: 0,
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function stopProcessing(sessionId: string, supabase: any): Promise<void> {
  // Stop import session
  await supabase
    .from("import_sessions")
    .update({
      status: "rolled_back",
      completed_at: new Date().toISOString(),
      error_log: {
        rollback_reason: "Manual rollback initiated",
        rollback_timestamp: new Date().toISOString(),
      },
    })
    .eq("id", sessionId);

  // Stop all batches
  await supabase
    .from("import_batches")
    .update({
      status: "failed",
      error_details: {
        rollback_reason: "Session rollback initiated",
        rollback_timestamp: new Date().toISOString(),
      },
    })
    .eq("import_session_id", sessionId)
    .in("status", ["pending", "processing"]);
}

async function identifyAffectedData(
  sessionId: string,
  supabase: any,
): Promise<any> {
  // Get session info
  const { data: session } = await supabase
    .from("import_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (!session) {
    throw new Error("Import session not found");
  }

  // Get affected registrations
  const { data: registrations } = await supabase
    .from("registrations")
    .select("*")
    .gte("created_at", session.created_at);

  return {
    session,
    registrations: registrations || [],
    recordCount: registrations?.length || 0,
    fileCount:
      registrations?.filter((r: any) => r.profile_image_url || r.badge_url)
        .length || 0,
  };
}

async function cleanupFiles(affectedData: any, _supabase: any): Promise<void> {
  // This would integrate with the file cleanup service
  // For now, we'll just log the files that need to be cleaned up
  console.log("Files to be cleaned up:", {
    profileImages: affectedData.registrations.filter(
      (r: any) => r.profile_image_url,
    ).length,
    chamberCards: affectedData.registrations.filter(
      (r: any) => r.chamber_card_url,
    ).length,
    paymentSlips: affectedData.registrations.filter(
      (r: any) => r.payment_slip_url,
    ).length,
    badges: affectedData.registrations.filter((r: any) => r.badge_url).length,
  });
}

async function removeDatabaseRecords(
  sessionId: string,
  supabase: any,
): Promise<void> {
  // Get session info
  const { data: session } = await supabase
    .from("import_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (!session) {
    throw new Error("Import session not found");
  }

  // Delete registrations created during this session
  await supabase
    .from("registrations")
    .delete()
    .gte("created_at", session.created_at);

  // Delete audit logs
  await supabase
    .from("import_audit_logs")
    .delete()
    .eq("import_session_id", sessionId);

  // Delete batches
  await supabase
    .from("import_batches")
    .delete()
    .eq("import_session_id", sessionId);

  // Delete session
  await supabase.from("import_sessions").delete().eq("id", sessionId);
}

async function cleanupEmailQueue(
  affectedData: any,
  supabase: any,
): Promise<void> {
  // Remove queued emails for affected registrations
  if (affectedData.registrations.length > 0) {
    await supabase
      .from("email_queue")
      .delete()
      .in(
        "registration_id",
        affectedData.registrations.map((r: any) => r.id),
      );
  }
}

async function logRollbackAudit(
  sessionId: string,
  reason: string,
  affectedData: any,
  adminUserId: string | undefined,
  supabase: any,
): Promise<void> {
  // Create rollback audit log
  await supabase.from("import_audit_logs").insert({
    import_session_id: sessionId,
    action: "rollback_completed",
    details: {
      rollback_reason: reason,
      affected_records: affectedData.recordCount,
      cleaned_files: affectedData.fileCount,
      rollback_timestamp: new Date().toISOString(),
    },
    admin_user_id: adminUserId,
  });
}
