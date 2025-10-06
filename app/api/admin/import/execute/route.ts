import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { validateSuperAdminAccess } from "@/lib/auth/admin-auth";
import { ImportProcessingPipeline } from "@/lib/import/importProcessingPipeline";

interface ExecuteImportRequest {
  sessionId: string;
  dryRun?: boolean;
  batchSize?: number;
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
      dryRun = false,
      batchSize = 10,
    }: ExecuteImportRequest = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Bad Request", message: "sessionId is required" },
        { status: 400 },
      );
    }

    // Verify session exists and belongs to admin
    const supabase = getSupabaseServiceClient();
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

    // Check if session is in valid state for execution
    if (session.status !== "processing") {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: `Session is in ${session.status} state and cannot be executed`,
        },
        { status: 400 },
      );
    }

    // Start import processing
    const pipeline = new ImportProcessingPipeline();
    const result = await pipeline.processImport({
      sessionId,
      adminUserId: adminValidation.user?.id || "",
      dryRun,
      batchSize,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Import Failed",
          message: "Import processing failed",
          details: result.errors,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: dryRun
        ? "Dry run completed successfully"
        : "Import completed successfully",
      result: {
        sessionId: result.sessionId,
        statistics: result.statistics,
        successfulRecords: result.successfulRecords || [],
        failedRecords: result.failedRecords || [],
        dryRun,
      },
    });
  } catch (error) {
    console.error("Error executing import:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to execute import" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } },
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

    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Bad Request", message: "sessionId is required" },
        { status: 400 },
      );
    }

    // Get import status
    const pipeline = new ImportProcessingPipeline();
    const status = await pipeline.getImportStatus(sessionId);
    const auditLogs = await pipeline.getImportAuditLogs(sessionId);

    return NextResponse.json({
      success: true,
      status,
      auditLogs,
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
