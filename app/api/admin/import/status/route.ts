import { NextRequest, NextResponse } from "next/server";
import { validateSuperAdminAccess } from "@/lib/auth/admin-auth";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const adminValidation = await validateSuperAdminAccess(request);
    if (!adminValidation.valid) {
      return NextResponse.json(
        { error: "Unauthorized", message: adminValidation.error },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Bad Request", message: "Session ID is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Get import session details
    const { data: session, error: sessionError } = await supabase
      .from("import_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("admin_user_id", adminValidation.user?.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        {
          error: "Not Found",
          message: "Import session not found or unauthorized",
        },
        { status: 404 },
      );
    }

    // Get registrations created in this session
    const { data: registrations, error: regError } = await supabase
      .from("registrations")
      .select(
        "id, registration_id, first_name, last_name, email, badge_url, email_sent, email_sent_at, created_at",
      )
      .gte("created_at", session.created_at)
      .order("created_at", { ascending: false });

    if (regError) {
      console.error("Error fetching registrations:", regError);
    }

    // Get email statistics
    const { count: totalEmails } = await supabase
      .from("email_outbox")
      .select("*", { count: "exact", head: true })
      .eq("template", "approval-badge")
      .gte("created_at", session.created_at);

    const { count: pendingEmails } = await supabase
      .from("email_outbox")
      .select("*", { count: "exact", head: true })
      .eq("template", "approval-badge")
      .eq("status", "pending")
      .gte("created_at", session.created_at);

    const { count: sentEmails } = await supabase
      .from("email_outbox")
      .select("*", { count: "exact", head: true })
      .eq("template", "approval-badge")
      .eq("status", "sent")
      .gte("created_at", session.created_at);

    const { count: failedEmails } = await supabase
      .from("email_outbox")
      .select("*", { count: "exact", head: true })
      .eq("template", "approval-badge")
      .eq("status", "failed")
      .gte("created_at", session.created_at);

    // Get badge statistics
    const registrationsWithBadges =
      registrations?.filter((r) => r.badge_url) || [];
    const registrationsWithEmails =
      registrations?.filter((r) => r.email_sent) || [];

    // Get recent audit logs
    const { data: auditLogs, error: auditError } = await supabase
      .from("import_audit_logs")
      .select("*")
      .eq("import_session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (auditError) {
      console.error("Error fetching audit logs:", auditError);
    }

    // Calculate progress percentages
    const totalRecords = session.total_records || 0;
    const processedRecords = session.processed_records || 0;
    const successfulRecords = session.successful_records || 0;
    const failedRecords = session.failed_records || 0;

    const progressPercentage =
      totalRecords > 0
        ? Math.round((processedRecords / totalRecords) * 100)
        : 0;
    const successPercentage =
      processedRecords > 0
        ? Math.round((successfulRecords / processedRecords) * 100)
        : 0;

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        filename: session.csv_filename,
        status: session.status,
        createdAt: session.created_at,
        completedAt: session.completed_at,
        totalRecords,
        processedRecords,
        successfulRecords,
        failedRecords,
        progressPercentage,
        successPercentage,
      },
      registrations: {
        total: registrations?.length || 0,
        withBadges: registrationsWithBadges.length,
        withEmails: registrationsWithEmails.length,
        recent: registrations?.slice(0, 10) || [],
      },
      emails: {
        total: totalEmails || 0,
        pending: pendingEmails || 0,
        sent: sentEmails || 0,
        failed: failedEmails || 0,
      },
      badges: {
        generated: registrationsWithBadges.length,
        pending: (registrations?.length || 0) - registrationsWithBadges.length,
      },
      auditLogs: auditLogs || [],
      summary: {
        isComplete: session.status === "completed",
        hasErrors: failedRecords > 0,
        allEmailsSent: (pendingEmails || 0) === 0,
        allBadgesGenerated:
          registrationsWithBadges.length === (registrations?.length || 0),
      },
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
