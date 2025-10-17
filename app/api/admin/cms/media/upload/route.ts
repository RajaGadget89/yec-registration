/**
 * CMS Media Upload API - File Upload Endpoint
 * Handles file uploads with authentication and validation
 */

import { NextRequest, NextResponse } from "next/server";
import { withMediaUploadGuard } from "../../../../../lib/cms-api-guard";
import { getCurrentUserFromRequest } from "../../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase/server";
import { uploadFileToSupabase } from "../../../../../lib/uploadFileToSupabase";
import { z } from "zod";

// File validation
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/gif",
  // Favicons
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const UploadSchema = z.object({
  alt_text: z.string().max(200).optional(),
  folder: z.string().max(100).default("cms-media"),
});

/**
 * POST /api/admin/cms/media/upload
 * Upload a file to the media library
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

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const altText = formData.get("alt_text") as string;
    const folder = (formData.get("folder") as string) || "cms-media";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Allowed types: " +
            ALLOWED_MIME_TYPES.join(", "),
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        },
        { status: 400 },
      );
    }

    // Ensure bucket allows this mime (auto-upgrade for ico in cms-media)
    try {
      if (
        folder === "cms-media" &&
        ["image/x-icon", "image/vnd.microsoft.icon"].includes(file.type)
      ) {
        const svc = getSupabaseServiceClient();
        const { data: buckets } = await svc.storage.listBuckets();
        const cms = buckets?.find((b: any) => b.name === folder);
        const current = (cms?.allowed_mime_types as string[] | undefined) || [];
        if (!current.includes(file.type)) {
          await svc.storage.updateBucket(folder, {
            public: true,
            allowedMimeTypes: Array.from(
              new Set([...current, "image/x-icon", "image/vnd.microsoft.icon"]),
            ),
          });
        }
      }
    } catch (e) {
      console.warn("Bucket allowlist check/update skipped:", e);
    }

    // Validate additional parameters
    const validatedData = UploadSchema.parse({
      alt_text: altText,
      folder: folder,
    });

    // Upload file to Supabase Storage
    let filePath: string;
    try {
      filePath = await uploadFileToSupabase(file, validatedData.folder);
      console.log("File uploaded successfully:", filePath);
    } catch (uploadError) {
      console.error("File upload failed:", uploadError);
      return NextResponse.json(
        {
          error:
            uploadError instanceof Error
              ? uploadError.message
              : "File upload failed",
        },
        { status: 500 },
      );
    }

    // Extract filename from filePath (remove folder prefix)
    const filename = filePath.split("/").pop() || file.name;

    // Helper function to check if a string is a valid UUID
    const isUuid = (str: string): boolean => {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };

    // Save media record to database
    // Use service client for media operations (bypasses RLS for admin operations)
    const supabase = getSupabaseServiceClient();
    const insertData: any = {
      filename: filename,
      original_filename: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      alt_text: validatedData.alt_text,
    };

    // Only set created_by if it's a valid UUID
    if (isUuid(user.id)) {
      insertData.created_by = user.id;
    }

    const { data: mediaRecord, error } = await supabase
      .from("cms_media")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error saving media record:", error);
      return NextResponse.json(
        { error: "Failed to save media record" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        media: mediaRecord,
        url: filePath,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Media upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
