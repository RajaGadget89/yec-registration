import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { validateSuperAdminAccess } from "@/lib/auth/admin-auth";

interface RollbackStatus {
  sessionId: string;
  status: "not_found" | "processing" | "completed" | "failed";
  progress: {
    phase: string;
    percentage: number;
    currentStep: string;
  };
  affectedData: {
    records: number;
    files: number;
    emails: number;
  };
  timeline: {
    started: string;
    estimated?: string;
    completed?: string;
  };
  error?: string;
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

    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Bad Request", message: "sessionId is required" },
        { status: 400 },
      );
    }

    // Get rollback status
    const status = await getRollbackStatus(sessionId);

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error getting rollback status:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to get rollback status",
      },
      { status: 500 },
    );
  }
}

async function getRollbackStatus(sessionId: string): Promise<RollbackStatus> {
  const supabase = getSupabaseServiceClient();

  try {
    // Check if session exists
    const { data: session, error: sessionError } = await supabase
      .from("import_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return {
        sessionId,
        status: "not_found",
        progress: {
          phase: "not_found",
          percentage: 0,
          currentStep: "Session not found",
        },
        affectedData: {
          records: 0,
          files: 0,
          emails: 0,
        },
        timeline: {
          started: new Date().toISOString(),
        },
      };
    }

    // Check if rollback is in progress
    if (session.status === "rolled_back") {
      return {
        sessionId,
        status: "completed",
        progress: {
          phase: "completed",
          percentage: 100,
          currentStep: "Rollback completed successfully",
        },
        affectedData: {
          records: session.processed_records || 0,
          files: 0, // Would need to calculate from audit logs
          emails: 0, // Would need to calculate from email queue
        },
        timeline: {
          started: session.created_at,
          completed: session.completed_at || new Date().toISOString(),
        },
      };
    }

    // Check if session is still processing
    if (session.status === "processing") {
      return {
        sessionId,
        status: "processing",
        progress: {
          phase: "import_in_progress",
          percentage: Math.round(
            (session.processed_records / session.total_records) * 100,
          ),
          currentStep: "Import in progress - rollback not yet initiated",
        },
        affectedData: {
          records: session.processed_records || 0,
          files: 0,
          emails: 0,
        },
        timeline: {
          started: session.created_at,
          estimated: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
        },
      };
    }

    // Check for rollback audit logs
    const { data: rollbackLogs } = await supabase
      .from("import_audit_logs")
      .select("*")
      .eq("import_session_id", sessionId)
      .eq("action", "rollback_completed")
      .order("created_at", { ascending: false })
      .limit(1);

    if (rollbackLogs && rollbackLogs.length > 0) {
      const rollbackLog = rollbackLogs[0];
      return {
        sessionId,
        status: "completed",
        progress: {
          phase: "completed",
          percentage: 100,
          currentStep: "Rollback completed successfully",
        },
        affectedData: {
          records: rollbackLog.details?.affected_records || 0,
          files: rollbackLog.details?.cleaned_files || 0,
          emails: 0,
        },
        timeline: {
          started: session.created_at,
          completed: rollbackLog.created_at,
        },
      };
    }

    // Default status
    return {
      sessionId,
      status: "processing",
      progress: {
        phase: "unknown",
        percentage: 0,
        currentStep: "Status unknown",
      },
      affectedData: {
        records: 0,
        files: 0,
        emails: 0,
      },
      timeline: {
        started: session.created_at,
      },
    };
  } catch (error: any) {
    console.error("Error getting rollback status:", error);
    return {
      sessionId,
      status: "failed",
      progress: {
        phase: "error",
        percentage: 0,
        currentStep: "Error getting status",
      },
      affectedData: {
        records: 0,
        files: 0,
        emails: 0,
      },
      timeline: {
        started: new Date().toISOString(),
      },
      error: error.message,
    };
  }
}
