import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { audit } from "@/app/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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

    // Get all forms
    const { data: forms, error: formsError } = await supabase
      .from("form_types")
      .select("form_key, name, config")
      .eq("is_active", true);

    if (formsError) {
      console.error("Error fetching forms:", formsError);
      return NextResponse.json(
        { error: "Failed to fetch forms" },
        { status: 500 }
      );
    }

    // Get badge status for each form
    const badgeStatus = await Promise.all(
      forms.map(async (form) => {
        const hasTemplate = !!form.config?.badge_config;
        
        // Get badge statistics
        const { count: totalRegistrations, error: totalError } = await supabase
          .from("form_registrations")
          .select("*", { count: "exact", head: true })
          .eq("form_key", form.form_key)
          .eq("is_active", true);

        const { count: badgesGenerated, error: badgesError } = await supabase
          .from("form_registrations")
          .select("*", { count: "exact", head: true })
          .eq("form_key", form.form_key)
          .eq("is_active", true)
          .not("badge_path", "is", null);

        const total = totalRegistrations || 0;
        const generated = badgesGenerated || 0;
        const pending = total - generated;
        const rate = total > 0 ? Math.round((generated / total) * 100 * 100) / 100 : 0;

        return {
          form_key: form.form_key,
          form_name: form.name,
          has_template: hasTemplate,
          template: hasTemplate ? form.config.badge_config : null,
          badge_stats: {
            total_registrations: total,
            badges_generated: generated,
            badges_pending: pending,
            badge_generation_rate: rate,
          },
        };
      })
    );

    // Log access
    await audit.logAccess({
      requestId: crypto.randomUUID(),
      actor: user.id,
      route: "/api/admin/super-admin/form-badge-templates/status",
      meta: { badge_status_requested: true },
    });

    return NextResponse.json({
      success: true,
      badgeStatus,
    });
  } catch (error) {
    console.error("Error in badge templates status API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
