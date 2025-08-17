import { NextRequest, NextResponse } from "next/server";
import { generateSignedUrl } from "../../lib/uploadFileToSupabase";

export async function POST(request: NextRequest) {
  try {
    const { filePath, expirySeconds = 3600 } = await request.json();

    if (!filePath || typeof filePath !== "string") {
      return NextResponse.json(
        {
          error: "Invalid file path",
          details: "filePath is required and must be a string",
        },
        { status: 400 }
      );
    }

    // Validate file path format
    if (!filePath.includes("/")) {
      return NextResponse.json(
        {
          error: "Invalid file path format",
          details: "File path must be in format 'bucket/filename'",
        },
        { status: 400 }
      );
    }

    console.log(`[SIGNED_URL_API] Generating signed URL for: ${filePath}, expiry: ${expirySeconds}s`);

    const signedUrl = await generateSignedUrl(filePath, expirySeconds);

    return NextResponse.json({
      success: true,
      signedUrl,
      message: "Signed URL generated successfully",
    });
  } catch (error) {
    console.error("Signed URL generation error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const statusCode = errorMessage.includes("Invalid") ? 400 : 500;
    
    return NextResponse.json(
      {
        error: "Failed to generate signed URL",
        details: errorMessage,
        status: statusCode,
      },
      { status: statusCode }
    );
  }
}
