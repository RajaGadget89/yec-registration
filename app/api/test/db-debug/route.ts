import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const registration_id = request.nextUrl.searchParams.get("registration_id");

  if (!id && !registration_id) {
    return NextResponse.json(
      { error: "ID or registration_id parameter required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServiceClient();

  // Query the registration directly
  const { data: registration, error } = await supabase
    .from("registrations")
    .select("*")
    .eq(id ? "id" : "registration_id", id || registration_id)
    .single();

  return NextResponse.json({
    id: id || registration_id,
    registration,
    error: error ? error.message : null,
    exists: !!registration,
  });
}
