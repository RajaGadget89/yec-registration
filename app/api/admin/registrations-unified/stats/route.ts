import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";
import { audit } from "../../../../lib/audit";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get total count from unified view
    const { count: total, error: totalError } = await supabase
      .from("admin_registrations_unified")
      .select("*", { count: "exact", head: true });

    if (totalError) {
      console.error("Error getting total count:", totalError);
    }

    // Get status breakdown
    const { data: statusData, error: statusError } = await supabase
      .from("admin_registrations_unified")
      .select("status")
      .not("status", "is", null);

    if (statusError) {
      console.error("Error getting status breakdown:", statusError);
    }

    const byStatus: Record<string, number> = {};
    statusData?.forEach((item: any) => {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    });

    // Get form type breakdown
    const { data: formTypeData, error: formTypeError } = await supabase
      .from("admin_registrations_unified")
      .select("form_type");

    if (formTypeError) {
      console.error("Error getting form type breakdown:", formTypeError);
    }

    const byFormType: Record<string, number> = {};
    formTypeData?.forEach((item: any) => {
      byFormType[item.form_type] = (byFormType[item.form_type] || 0) + 1;
    });

    // Get recent registrations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: recent, error: recentError } = await supabase
      .from("admin_registrations_unified")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());

    if (recentError) {
      console.error("Error getting recent registrations:", recentError);
    }

    const stats = {
      total_registrations: total || 0,
      by_status: byStatus,
      by_form_type: byFormType,
      recent_registrations: recent || 0,
    };

    // Log access
    await audit.logAccess({
      action: "GET",
      method: "GET",
      resource: "registrations-unified-stats",
      result: "success",
      request_id: crypto.randomUUID(),
      meta: { stats_requested: true },
    });

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error in unified registrations stats API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
