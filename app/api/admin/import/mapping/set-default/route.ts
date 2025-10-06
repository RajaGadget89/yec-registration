import { NextRequest, NextResponse } from "next/server";
import { validateSuperAdminAccess } from "@/lib/auth/admin-auth";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

const BUCKET = process.env.SUPABASE_STORAGE_CONFIG_BUCKET || "import-mappings";
const DEFAULT_KEY = "default.json";

export async function POST(request: NextRequest) {
  try {
    const adminValidation = await validateSuperAdminAccess(request);
    if (!adminValidation.valid) {
      return NextResponse.json(
        { error: "Unauthorized", message: adminValidation.error },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { mappingConfig } = body || {};
    if (!mappingConfig) {
      return NextResponse.json(
        { error: "Bad Request", message: "mappingConfig is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Ensure bucket exists (first-time setup safety)
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const exists = (buckets || []).some((b: any) => b.name === BUCKET);
      if (!exists) {
        await supabase.storage.createBucket(BUCKET, { public: false });
      }
    } catch (_e) {
      // proceed; upload will surface error if bucket doesn't exist
    }

    const blob = new Blob([JSON.stringify(mappingConfig, null, 2)], {
      type: "application/json",
    });
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(DEFAULT_KEY, blob, {
        upsert: true,
        contentType: "application/json",
      });
    if (error) {
      console.error("set-default upload error:", error);
      return NextResponse.json(
        {
          error: "Internal Server Error",
          message: `Failed to set default: ${error.message || "upload error"}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("mapping/set-default error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
