import { NextRequest, NextResponse } from "next/server";
import { uploadFileToSupabase } from "../../lib/uploadFileToSupabase";
import {
  validateFile,
  type ValidationDimension,
} from "../../lib/files/validation";
import {
  fileValidationMessage,
  getLanguageFromHeader,
} from "../../lib/i18n/file-validation";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string;
    const filename = formData.get("filename") as string | undefined;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!folder) {
      return NextResponse.json(
        { error: "No folder specified" },
        { status: 400 },
      );
    }

    // Map folder to validation dimension
    const folderToDimension: Record<string, ValidationDimension> = {
      "profile-images": "profile",
      "chamber-cards": "tcc",
      "payment-slips": "payment",
    };

    const dimension = folderToDimension[folder];
    if (dimension) {
      // Get language from Accept-Language header
      const acceptLanguage = request.headers.get("accept-language");
      const language = getLanguageFromHeader(acceptLanguage);

      // Validate file using our centralized validation
      const validationResult = validateFile({
        dimension,
        mime: file.type,
        sizeBytes: file.size,
      });

      if (!validationResult.ok) {
        // Generate localized error message
        const message = fileValidationMessage(
          validationResult.code!,
          language,
          {
            allowed: validationResult.allowed,
            limitBytes: validationResult.limitBytes,
          },
        );

        // Return structured error response matching AC6 specification
        return NextResponse.json(
          {
            code: "FILE_VALIDATION_FAILED",
            errors: [
              {
                dimension,
                code: validationResult.code,
                message,
              },
            ],
          },
          { status: 422 },
        );
      }
    }

    // Upload file using server-side function
    console.log(
      `[UPLOAD] Starting upload for folder: ${folder}, filename: ${filename || "auto-generated"}, size: ${file.size}, type: ${file.type}`,
    );

    const fileUrl = await uploadFileToSupabase(file, folder, filename);

    console.log(`[UPLOAD] Successfully uploaded to: ${fileUrl}`);

    return NextResponse.json({
      success: true,
      fileUrl,
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("File upload error:", error);

    // Provide structured error response
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const statusCode =
      errorMessage.includes("size") || errorMessage.includes("type")
        ? 400
        : 500;

    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: errorMessage,
        status: statusCode,
      },
      { status: statusCode },
    );
  }
}
