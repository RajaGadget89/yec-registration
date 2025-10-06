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
      .from("import_batches")
      .select("*")
      .eq("import_session_id", sessionId)
      .order("batch_number", { ascending: true });

    if (batchesError) {
      console.error("Error fetching import batches:", batchesError);
    }

    // Calculate progress metrics
    const currentBatch =
      batches?.find((b) => b.status === "processing")?.batch_number || 0;
    const totalBatches = batches?.length || 0;
    const processedRecords = session.processed_records || 0;
    const successfulRecords = session.successful_records || 0;
    const failedRecords = session.failed_records || 0;

    // Determine current operation
    let currentOperation = "Idle";
    if (session.status === "processing") {
      if (currentBatch > 0) {
        currentOperation = `Processing batch ${currentBatch} of ${totalBatches}`;
      } else {
        currentOperation = "Starting import process...";
      }
    } else if (session.status === "completed") {
      currentOperation = "Import completed successfully";
    } else if (session.status === "failed") {
      currentOperation = "Import failed";
    }

    // Calculate estimated completion time
    let estimatedCompletion = "Unknown";
    if (session.status === "processing" && session.total_records > 0) {
      const progressPercentage = processedRecords / session.total_records;
      if (progressPercentage > 0) {
        const startTime = new Date(session.created_at).getTime();
        const currentTime = new Date().getTime();
        const elapsedMs = currentTime - startTime;
        const estimatedTotalMs = elapsedMs / progressPercentage;
        const remainingMs = estimatedTotalMs - elapsedMs;
        const remainingMinutes = Math.round(remainingMs / 60000);

        if (remainingMinutes < 1) {
          estimatedCompletion = "Less than 1 minute";
        } else if (remainingMinutes < 60) {
          estimatedCompletion = `${remainingMinutes} minutes`;
        } else {
          const hours = Math.floor(remainingMinutes / 60);
          const minutes = remainingMinutes % 60;
          estimatedCompletion = `${hours}h ${minutes}m`;
        }
      }
    } else if (session.status === "completed") {
      estimatedCompletion = "Completed";
    }

    return NextResponse.json({
      success: true,
      currentBatch,
      totalBatches,
      processedRecords,
      successfulRecords,
      failedRecords,
      estimatedCompletion,
      currentOperation,
    });
  } catch (error) {
    console.error("Error getting import progress:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to get import progress",
      },
      { status: 500 },
    );
  }
}
