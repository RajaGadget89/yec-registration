import { NextRequest, NextResponse } from "next/server";
import { validateSuperAdminAccess } from "@/lib/auth/admin-auth";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { dispatchEmailBatch } from "@/lib/emails/dispatcher";

export async function POST(request: NextRequest) {
  try {
    const adminValidation = await validateSuperAdminAccess(request);
    if (!adminValidation.valid) {
      return NextResponse.json(
        { error: "Unauthorized", message: adminValidation.error },
        { status: 401 },
      );
    }

    const { sessionId, batchSize = 50, dryRun = false } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Bad Request", message: "Session ID is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Verify session exists and belongs to the admin
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

    // Get email statistics for this session
    const { data: sessionData } = await supabase
      .from("import_sessions")
      .select("created_at")
      .eq("id", sessionId)
      .single();

    if (!sessionData) {
      return NextResponse.json(
        { error: "Not Found", message: "Session data not found" },
        { status: 404 },
      );
    }

    // Count pending emails for this session (using traditional template)
    const { count: pendingEmails } = await supabase
      .from("email_outbox")
      .select("*", { count: "exact", head: true })
      .eq("template", "approval-badge")
      .eq("status", "pending")
      .gte("created_at", sessionData.created_at);

    if (pendingEmails === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending emails found for this session",
        dispatched: 0,
        remaining: 0,
      });
    }

    // Dispatch emails in batches
    const dispatchResult = await dispatchEmailBatch(batchSize, dryRun);

    // Log the dispatch event
    await supabase.from("import_audit_logs").insert({
      import_session_id: sessionId,
      admin_user_id: adminValidation.user?.id,
      event_type: "email_dispatch",
      event_details: {
        batch_size: batchSize,
        dry_run: dryRun,
        dispatched: dispatchResult.sent,
        errors: dispatchResult.errors,
        remaining: dispatchResult.remaining,
      },
    });

    return NextResponse.json({
      success: true,
      message: dryRun
        ? "Email dispatch dry run completed"
        : "Email dispatch completed",
      result: {
        dispatched: dispatchResult.sent,
        errors: dispatchResult.errors,
        remaining: dispatchResult.remaining,
        details: dispatchResult.details,
      },
    });
  } catch (error) {
    console.error("Error dispatching import emails:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to dispatch emails" },
      { status: 500 },
    );
  }
}

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

    // Verify session exists and belongs to the admin
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

    // Get email statistics
    const { data: sessionData } = await supabase
      .from("import_sessions")
      .select("created_at")
      .eq("id", sessionId)
      .single();

    if (!sessionData) {
      return NextResponse.json(
        { error: "Not Found", message: "Session data not found" },
        { status: 404 },
      );
    }

    // Count emails by status
    const { count: totalEmails } = await supabase
      .from("email_outbox")
      .select("*", { count: "exact", head: true })
      .eq("template", "approval-badge")
      .gte("created_at", sessionData.created_at);

    const { count: pendingEmails } = await supabase
      .from("email_outbox")
      .select("*", { count: "exact", head: true })
      .eq("template", "approval-badge")
      .eq("status", "pending")
      .gte("created_at", sessionData.created_at);

    const { count: sentEmails } = await supabase
      .from("email_outbox")
      .select("*", { count: "exact", head: true })
      .eq("template", "approval-badge")
      .eq("status", "sent")
      .gte("created_at", sessionData.created_at);

    const { count: failedEmails } = await supabase
      .from("email_outbox")
      .select("*", { count: "exact", head: true })
      .eq("template", "approval-badge")
      .eq("status", "failed")
      .gte("created_at", sessionData.created_at);

    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      emailStats: {
        total: totalEmails || 0,
        pending: pendingEmails || 0,
        sent: sentEmails || 0,
        failed: failedEmails || 0,
      },
    });
  } catch (error) {
    console.error("Error getting email statistics:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to get email statistics",
      },
      { status: 500 },
    );
  }
}
