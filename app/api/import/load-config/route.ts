import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function GET(_request: NextRequest) {
  try {
    const BUCKET =
      process.env.SUPABASE_STORAGE_CONFIG_BUCKET || "import-mappings";
    const KEY = process.env.SUPABASE_STORAGE_CONFIG_KEY || "default.json";
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.storage.from(BUCKET).download(KEY);
    if (error) {
      return NextResponse.json(
        { error: `Configuration not found in storage: ${error.message}` },
        { status: 404 },
      );
    }
    const text = await data.text();
    const json = JSON.parse(text || "{}");
    return NextResponse.json(json);
  } catch (error: any) {
    console.error("Error loading JSON configuration from storage:", error);
    return NextResponse.json(
      { error: `Failed to load configuration: ${error.message}` },
      { status: 500 },
    );
  }
}
