import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    if (user.role !== "super_admin" && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getSupabaseServiceClient();

    // Get all hotels
    const { data: hotels, error } = await supabase
      .from("seminar_hotels")
      .select("id, name, location, description")
      .order("name");

    if (error) {
      console.error("Hotels query error:", error);
      return NextResponse.json(
        { error: "Database query failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ hotels: hotels || [] });
  } catch (error) {
    console.error("Hotels list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
