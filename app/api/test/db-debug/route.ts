import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "ID parameter required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServiceClient();

  // Query the registration directly
  const { data: registration, error } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", id)
    .single();

  return NextResponse.json({
    id,
    registration,
    error: error ? error.message : null,
    exists: !!registration,
  });
}
