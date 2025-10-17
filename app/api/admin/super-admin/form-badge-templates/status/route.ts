import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../lib/supabase/server";
import { audit } from "../../../../../lib/audit";
import { hasRoleFromRequest } from "../../../../../lib/auth-utils.server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Allow admin and super_admin
    if (!(await hasRoleFromRequest(request as any, "admin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all forms (with optional search)
    let formsQuery = supabase
      .from("form_types")
      .select("form_key, name, created_at, config")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (search) {
      formsQuery = formsQuery.or(
        `name.ilike.%${search}%,form_key.ilike.%${search}%` as any,
      );
    }

    const { data: allForms, error: formsError } = await formsQuery;

    if (formsError) {
      console.error("Error fetching forms:", formsError);
      return NextResponse.json(
        { error: "Failed to fetch forms" },
        { status: 500 },
      );
    }

    const forms = allForms || [];
    const offset = (page - 1) * limit;
    const pageForms = forms.slice(offset, offset + limit);

    // Get badge status for each form
    const badgeStatus = await Promise.all(
      pageForms.map(async (form) => {
        // Prefer new table
        let hasTemplate = false;
        let template: any = null;
        const { data: tmpl } = await supabase
          .from("form_badge_templates")
          .select("template")
          .eq("form_key", form.form_key)
          .eq("is_active", true)
          .maybeSingle();
        if (tmpl?.template) {
          hasTemplate = true;
          template = tmpl.template;
        } else if (form.config?.badge_config) {
          hasTemplate = true;
          template = form.config.badge_config;
        }

        // Get badge statistics
        const { count: totalRegistrations, error: _totalError } = await supabase
          .from("form_registrations")
          .select("*", { count: "exact", head: true })
          .eq("form_key", form.form_key)
          .eq("is_active", true);

        const { count: badgesGenerated, error: _badgesError } = await supabase
          .from("form_registrations")
          .select("*", { count: "exact", head: true })
          .eq("form_key", form.form_key)
          .eq("is_active", true)
          .not("badge_path", "is", null);

        const total = totalRegistrations || 0;
        const generated = badgesGenerated || 0;
        const pending = total - generated;
        const rate =
          total > 0 ? Math.round((generated / total) * 100 * 100) / 100 : 0;

        return {
          form_key: form.form_key,
          form_name: form.name,
          has_template: hasTemplate,
          template,
          badge_stats: {
            total_registrations: total,
            badges_generated: generated,
            badges_pending: pending,
            badge_generation_rate: rate,
          },
        };
      }),
    );

    // Log access
    await audit.logAccess({
      action: "GET",
      method: "GET",
      resource: "form-badge-templates-status",
      result: "success",
      request_id: crypto.randomUUID(),
      meta: { badge_status_requested: true },
    });

    return NextResponse.json({
      success: true,
      badgeStatus,
      totalItems: forms.length,
      totalPages: Math.ceil((forms.length || 0) / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error in badge templates status API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
