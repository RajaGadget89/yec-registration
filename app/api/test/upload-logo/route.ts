import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  // Security check - only allow in test environment
  const testHelpersEnabled = request.headers.get("X-Test-Helpers-Enabled");
  const authHeader = request.headers.get("Authorization");

  if (testHelpersEnabled !== "1" || !authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Test helpers not enabled or unauthorized" },
      { status: 403 },
    );
  }

  const token = authHeader.replace("Bearer ", "");
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    console.log("[UPLOAD-LOGO] Starting logo upload...");

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read the logo file
    const logoPath = path.join(
      process.cwd(),
      "public",
      "assets",
      "yec-icon-only.png",
    );

    if (!fs.existsSync(logoPath)) {
      throw new Error(`Logo file not found at: ${logoPath}`);
    }

    const logoBuffer = fs.readFileSync(logoPath);
    console.log(
      "[UPLOAD-LOGO] Logo file read successfully, size:",
      logoBuffer.length,
    );

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from("yec-assets")
      .upload("yec-icon-only.png", logoBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (error) {
      console.error("[UPLOAD-LOGO] Upload error:", error);
      throw error;
    }

    console.log("[UPLOAD-LOGO] Logo uploaded successfully:", data);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("yec-assets")
      .getPublicUrl("yec-icon-only.png");

    console.log("[UPLOAD-LOGO] Public URL:", urlData.publicUrl);

    return NextResponse.json({
      success: true,
      message: "Logo uploaded successfully",
      data,
      publicUrl: urlData.publicUrl,
    });
  } catch (error) {
    console.error("[UPLOAD-LOGO] Error:", error);
    return NextResponse.json(
      {
        error: "Logo upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
