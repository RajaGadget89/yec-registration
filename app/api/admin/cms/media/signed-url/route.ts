/**
 * CMS Media Signed URL API - Generate signed URLs for private bucket files
 * Handles signed URL generation for media files with authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { withMediaUploadGuard } from "../../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase/server";
import { z } from "zod";

const SignedUrlSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
});

/**
 * POST /api/admin/cms/media/signed-url
 * Generate signed URL for a media file
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withMediaUploadGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = SignedUrlSchema.parse(body);

    const supabase = getSupabaseServiceClient();

    // Parse the file path to get bucket and file path
    const [bucket, ...pathParts] = validatedData.filePath.split("/");
    const filePathInBucket = pathParts.join("/");

    if (!bucket || !filePathInBucket) {
      return NextResponse.json(
        {
          error: "Invalid file path format",
        },
        { status: 400 },
      );
    }

    // Generate signed URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePathInBucket, 3600);

    if (error) {
      console.error("Error generating signed URL:", error);
      return NextResponse.json(
        {
          error: "Failed to generate signed URL",
        },
        { status: 500 },
      );
    }

    if (!data?.signedUrl) {
      return NextResponse.json(
        {
          error: "No signed URL returned",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    console.error("Signed URL generation error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
