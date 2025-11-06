import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "../../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "super_admin" && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getSupabaseServiceClient();

    const count = async (table: string) => {
      const { count } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true });
      return count ?? 0;
    };

    const [
      participants,
      accommodations,
      accommodationDaily,
      transportation,
      finances,
      events,
    ] = await Promise.all([
      count("seminar_participants"),
      count("seminar_accommodations"),
      count("seminar_accommodation_daily"),
      count("seminar_transportation"),
      count("seminar_finances"),
      count("seminar_event_participants"),
    ]);

    return NextResponse.json({
      success: true,
      updatedAt: new Date().toISOString(),
      counts: {
        participants,
        accommodations,
        accommodationDaily,
        transportation,
        finances,
        events,
      },
    });
  } catch (err) {
    console.error("import stats error", err);
    return NextResponse.json({ error: "Failed to get stats" }, { status: 500 });
  }
}
