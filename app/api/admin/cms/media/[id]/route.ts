/**
 * CMS Media Delete API - Delete individual media files
 * Handles media file deletion with authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { withMediaUploadGuard } from "../../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase/server";

/**
 * DELETE /api/admin/cms/media/[id]
 * Delete a media file by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withMediaUploadGuard(request);
    if (guardResponse) return guardResponse;

    const { id } = await params;
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service client for media operations (bypasses RLS for admin operations)
    const supabase = getSupabaseServiceClient();

    // First, get the media record to get the file path
    const { data: mediaRecord, error: fetchError } = await supabase
      .from("cms_media")
      .select("file_path, filename")
      .eq("id", id)
      .single();

    if (fetchError || !mediaRecord) {
      console.error("Error fetching media record:", fetchError);
      return NextResponse.json(
        { error: "Media file not found" },
        { status: 404 },
      );
    }

    // Extract the file path from the full URL
    const filePath = mediaRecord.file_path.split("/").pop();
    if (!filePath) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // Delete from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from("cms-media")
      .remove([filePath]);

    if (storageError) {
      console.error("Error deleting from storage:", storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("cms_media")
      .delete()
      .eq("id", id);

    if (dbError) {
      console.error("Error deleting from database:", dbError);
      return NextResponse.json(
        { error: "Failed to delete media record" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Media file deleted successfully",
    });
  } catch (error) {
    console.error("Media DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
