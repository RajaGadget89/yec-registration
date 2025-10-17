import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../lib/supabase/server";
import { audit } from "../../../../../lib/audit";
import { formCheckinService } from "../../../../../lib/form-system/formCheckinService";

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

    // Check if user has super admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all form check-in configurations
    const configs = await formCheckinService.getAllFormCheckinConfigs();

    // Get statistics for each form
    const checkinStatus = await Promise.all(
      configs.map(async (config) => {
        const stats = await formCheckinService.getCheckinStats(config.form_key);
        return {
          ...config,
          stats,
        };
      }),
    );

    // Log access
    await audit.logAccess({
      action: "GET",
      method: "GET",
      resource: "form-checkin-config-status",
      result: "success",
      request_id: crypto.randomUUID(),
      meta: { checkin_status_requested: true },
    });

    return NextResponse.json({
      success: true,
      checkinStatus,
    });
  } catch (error) {
    console.error("Error in form check-in config status API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
