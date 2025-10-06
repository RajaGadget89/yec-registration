import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { validateSuperAdminAccess } from "@/lib/auth/admin-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const adminValidation = await validateSuperAdminAccess(request);
    if (!adminValidation.valid) {
      return NextResponse.json(
        { error: "Unauthorized", message: adminValidation.error },
        { status: 401 },
      );
    }

    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Bad Request", message: "Session ID is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from("import_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("admin_user_id", adminValidation.user?.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Not Found", message: "Import session not found" },
        { status: 404 },
      );
    }

    // Get batch details
    const { data: batches, error: batchesError } = await supabase
      .from("importbatches")
      .select("*")
      .eq("import_session_id", sessionId)
      .order("batch_number", { ascending: true });

    if (batchesError) {
      console.error("Error fetching import batches:", batchesError);
    }

    // Get audit logs
    const { data: auditLogs, error: auditError } = await supabase
      .from("import_audit_logs")
      .select("*")
      .eq("import_session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (auditError) {
      console.error("Error fetching audit logs:", auditError);
    }

    // Calculate progress
    const progress = {
      processedRecords: session.processed_records,
      successfulRecords: session.successful_records,
      failedRecords: session.failed_records,
      currentBatch:
        batches?.find((b) => b.status === "processing")?.batch_number || 0,
      totalBatches: batches?.length || 0,
      currentOperation: getCurrentOperation(session.status, batches || []),
      estimatedCompletion: calculateEstimatedCompletion(session, batches || []),
    };

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        filename: session.csv_filename,
        status: session.status,
        totalRecords: session.total_records,
        successfulRecords: session.successful_records,
        failedRecords: session.failed_records,
        createdAt: session.created_at,
        completedAt: session.completed_at,
      },
      progress,
      batches: batches || [],
      auditLogs: auditLogs || [],
    });
  } catch (error) {
    console.error("Error getting import status:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to get import status",
      },
      { status: 500 },
    );
  }
}

function getCurrentOperation(status: string, batches: any[]): string {
  switch (status) {
    case "processing":
      const processingBatch = batches?.find((b) => b.status === "processing");
      if (processingBatch) {
        return `Processing batch ${processingBatch.batch_number}`;
      }
      return "Processing import...";
    case "completed":
      return "Import completed successfully";
    case "failed":
      return "Import failed";
    case "rolled_back":
      return "Import rolled back";
    default:
      return "Unknown status";
  }
}

function calculateEstimatedCompletion(session: any, batches: any[]): string {
  if (session.status === "completed" || session.status === "failed") {
    return "Completed";
  }

  if (session.total_records === 0) {
    return "Unknown";
  }

  const processedPercentage = session.processed_records / session.total_records;
  if (processedPercentage === 0) {
    return "Starting...";
  }

  const startTime = new Date(session.created_at).getTime();
  const currentTime = new Date().getTime();
  const elapsedMs = currentTime - startTime;
  const estimatedTotalMs = elapsedMs / processedPercentage;
  const remainingMs = estimatedTotalMs - elapsedMs;
  const remainingMinutes = Math.round(remainingMs / 60000);

  if (remainingMinutes < 1) {
    return "Less than 1 minute";
  } else if (remainingMinutes < 60) {
    return `${remainingMinutes} minutes`;
  } else {
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    return `${hours}h ${minutes}m`;
  }
}
