import { NextRequest, NextResponse } from "next/server";
import { validateSuperAdminAccess } from "@/lib/auth/admin-auth";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

const BUCKET = process.env.SUPABASE_STORAGE_CONFIG_BUCKET || "import-mappings";
const DEFAULT_KEY = "default.json";

export async function GET(request: NextRequest) {
  try {
    const adminValidation = await validateSuperAdminAccess(request);
    if (!adminValidation.valid) {
      return NextResponse.json(
        { error: "Unauthorized", message: adminValidation.error },
        { status: 401 },
      );
    }

    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(DEFAULT_KEY);
    if (error) {
      // Return 204 No Content instead of 404 to avoid noisy console errors on first-time setup
      return new NextResponse(null, { status: 204 });
    }

    const text = await data.text();
    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("mapping/default GET error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
