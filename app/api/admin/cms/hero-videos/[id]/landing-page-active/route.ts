import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../../lib/supabase/server";
import { withContentManagementGuard } from "../../../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../../../lib/auth-utils.server";

/**
 * PUT /api/admin/cms/hero-videos/[id]/landing-page-active
 * Set a hero video as the active landing page video
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = getSupabaseServiceClient();

    // First, verify the hero video exists and is active
    const { data: video, error: videoError } = await supabase
      .from("cms_hero_videos")
      .select("id, is_active")
      .eq("id", id)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: "Hero video not found" },
        { status: 404 },
      );
    }

    if (!video.is_active) {
      return NextResponse.json(
        { error: "Cannot set inactive hero video as landing page active" },
        { status: 400 },
      );
    }

    // Get current landing page active video
    const { data: currentActive } = await supabase
      .from("cms_hero_videos")
      .select("id")
      .eq("is_landing_page_active", true)
      .single();

    console.log(
      "Current active video:",
      currentActive?.id,
      "Target video:",
      id,
    );

    // Check if the target video is already the active one
    if (currentActive && currentActive.id === id) {
      console.log("Video is already active, returning success");
      return NextResponse.json({
        success: true,
        video: { id, is_landing_page_active: true },
        message: "Hero video is already active for the landing page",
      });
    }

    // First, deactivate any currently active landing page video
    if (currentActive) {
      console.log("Deactivating current landing page video:", currentActive.id);
      const { error: deactivateError } = await supabase
        .from("cms_hero_videos")
        .update({ is_landing_page_active: false })
        .eq("id", currentActive.id);

      if (deactivateError) {
        console.error(
          "Error deactivating current landing page video:",
          deactivateError,
        );
        return NextResponse.json(
          { error: "Failed to deactivate current landing page video" },
          { status: 500 },
        );
      }
    }

    // Set the new video as landing page active
    console.log("Attempting to update hero video with ID:", id);
    const { data: updatedVideo, error: updateError } = await supabase
      .from("cms_hero_videos")
      .update({ is_landing_page_active: true })
      .eq("id", id)
      .select("id, is_landing_page_active")
      .single();

    if (updateError) {
      console.error("Error updating landing page hero video:", updateError);
      console.error(
        "Update error details:",
        JSON.stringify(updateError, null, 2),
      );
      return NextResponse.json(
        { error: "Failed to update landing page hero video" },
        { status: 500 },
      );
    }

    console.log("Successfully updated hero video:", updatedVideo);

    // Log the change for audit trail
    // Note: Audit logging is handled by the audit system, not direct table inserts

    return NextResponse.json({
      success: true,
      video: updatedVideo,
      message: `Hero video is now active for the landing page`,
    });
  } catch (error) {
    console.error("Landing page hero video PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/cms/hero-videos/[id]/landing-page-active
 * Remove landing page active status from a hero video
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = getSupabaseServiceClient();

    // Get current video info
    const { data: video, error: videoError } = await supabase
      .from("cms_hero_videos")
      .select("id, is_landing_page_active")
      .eq("id", id)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: "Hero video not found" },
        { status: 404 },
      );
    }

    if (!video.is_landing_page_active) {
      return NextResponse.json(
        { error: "This video is not currently active for the landing page" },
        { status: 400 },
      );
    }

    // Remove landing page active status
    const { data: updatedVideo, error: updateError } = await supabase
      .from("cms_hero_videos")
      .update({ is_landing_page_active: false })
      .eq("id", id)
      .select("id, is_landing_page_active")
      .single();

    if (updateError) {
      console.error("Error removing landing page active status:", updateError);
      return NextResponse.json(
        { error: "Failed to remove landing page active status" },
        { status: 500 },
      );
    }

    // Log the change for audit trail
    // Note: Audit logging is handled by the audit system, not direct table inserts

    return NextResponse.json({
      success: true,
      video: updatedVideo,
      message: `Hero video is no longer active for the landing page`,
    });
  } catch (error) {
    console.error("Landing page hero video DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
