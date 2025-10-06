import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { validateSuperAdminAccess } from "@/lib/auth/admin-auth";

export async function GET(request: NextRequest) {
  try {
    const adminValidation = await validateSuperAdminAccess(request);
    if (!adminValidation.valid) {
      return NextResponse.json(
        { error: "Unauthorized", message: adminValidation.error },
        { status: 401 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Get all import sessions for the admin user
    const { data: sessions, error: sessionsError } = await supabase
      .from("import_sessions")
      .select("*")
      .eq("admin_user_id", adminValidation.user?.id)
      .order("created_at", { ascending: false });

    if (sessionsError) {
      console.error("Error fetching import sessions:", sessionsError);
      return NextResponse.json(
        {
          error: "Internal Server Error",
          message: "Failed to fetch import sessions",
        },
        { status: 500 },
      );
    }

    // Transform sessions data
    const transformedSessions = sessions.map((session) => ({
      id: session.id,
      filename: session.csv_filename,
      status: session.status,
      totalRecords: session.total_records,
      successfulRecords: session.successful_records,
      failedRecords: session.failed_records,
      createdAt: session.created_at,
      completedAt: session.completed_at,
    }));

    return NextResponse.json({
      success: true,
      sessions: transformedSessions,
    });
  } catch (error) {
    console.error("Error in import history:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to fetch import history",
      },
      { status: 500 },
    );
  }
}
