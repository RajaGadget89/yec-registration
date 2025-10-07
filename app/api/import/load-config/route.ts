import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

// This public loader returns the current default mapping/transformation JSON
// from Supabase Storage. It intentionally skips admin auth because it is
// consumed by the Step 2 UI for read-only display of transformations.

const BUCKET = process.env.SUPABASE_STORAGE_CONFIG_BUCKET || "import-mappings";
const DEFAULT_KEY = "default.json";

export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(DEFAULT_KEY);

    if (error) {
      // Return 204 to indicate no configuration yet (first-time setup)
      return new NextResponse(null, {
        status: 204,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const text = await data.text();

    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Ensure clients never cache this file; we always want latest from storage
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("/api/import/load-config error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
