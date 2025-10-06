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
        { error: "Bad Request", message: "sessionId is required" },
        { status: 400 },
      );
    }

    // Get import session with metadata
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

    // Extract registration result from metadata
    const metadata = session.metadata as any;
    const registrationResult = metadata?.registrationResult || {};

    return NextResponse.json({
      success: true,
      result: {
        sessionId: session.id,
        status: session.status,
        statistics: {
          totalRecords: session.total_records || 0,
          successfulRecords: session.successful_records || 0,
          failedRecords: session.failed_records || 0,
        },
        successfulRecords: registrationResult.successfulRecords || [],
        failedRecords: registrationResult.failedRecords || [],
      },
    });
  } catch (error) {
    console.error("Error getting import results:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to get import results",
      },
      { status: 500 },
    );
  }
}
