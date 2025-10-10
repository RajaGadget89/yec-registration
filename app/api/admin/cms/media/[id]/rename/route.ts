import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../../lib/supabase/server";
import { getCurrentUserFromRequest } from "../../../../../../lib/auth-utils.server";
import { withMediaUploadGuard } from "../../../../../../lib/cms-api-guard";
import { z } from "zod";

const RenameSchema = z.object({
  new_filename: z.string().min(1, "New filename is required"),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guardResponse = await withMediaUploadGuard(request);
  if (guardResponse) return guardResponse;

  const { id } = await params;
  const supabase = getSupabaseServiceClient();
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { new_filename } = RenameSchema.parse(body);

    console.log(`Attempting to rename media file ${id} to ${new_filename}`);

    // First, check if the file exists
    const { data: existingFile, error: fetchError } = await supabase
      .from("cms_media")
      .select("id, original_filename")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching media file:", fetchError);
      return NextResponse.json(
        { error: "Media file not found" },
        { status: 404 },
      );
    }

    if (!existingFile) {
      return NextResponse.json(
        { error: "Media file not found" },
        { status: 404 },
      );
    }

    console.log(`Found media file: ${existingFile.original_filename}`);

    // Use a direct SQL query that bypasses triggers
    const { error } = await supabase
      .from("cms_media")
      .update({
        original_filename: new_filename,
      })
      .eq("id", id)
      .select("id");

    if (error) {
      console.error("Error renaming media file:", error);
      return NextResponse.json(
        { error: `Failed to rename file: ${error.message}` },
        { status: 500 },
      );
    }

    console.log(`Successfully renamed file to: ${new_filename}`);

    return NextResponse.json(
      {
        success: true,
        message: "File renamed successfully",
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error in PUT /api/admin/cms/media/[id]/rename:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
