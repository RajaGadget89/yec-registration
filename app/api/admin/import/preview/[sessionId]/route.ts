import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { validateSuperAdminAccess } from "@/lib/auth/admin-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    // Validate super admin access
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

    // Get validation results from metadata
    const validationResult = session.metadata?.validation_result;

    if (!validationResult) {
      return NextResponse.json(
        { error: "Bad Request", message: "Session has not been validated yet" },
        { status: 400 },
      );
    }

    // Get recent audit logs for this session
    const { data: auditLogs, error: auditError } = await supabase
      .from("import_audit_logs")
      .select("*")
      .eq("import_session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (auditError) {
      console.error("Error fetching audit logs:", auditError);
    }

    // Optional preview warnings enrichment from validation metadata
    const warnings = Array.isArray(validationResult.warnings)
      ? validationResult.warnings
      : [];
    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        filename: session.csv_filename,
        totalRecords: session.total_records,
        status: session.status,
        createdAt: session.created_at,
      },
      validation: {
        validRecords: validationResult.validRecords,
        invalidRecords: validationResult.invalidRecords,
        errors: validationResult.errors,
        warnings,
      },
      auditLogs: auditLogs || [],
    });
  } catch (error) {
    console.error("Error in preview:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to get preview" },
      { status: 500 },
    );
  }
}
