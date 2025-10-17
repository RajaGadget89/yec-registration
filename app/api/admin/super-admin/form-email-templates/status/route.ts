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
    const status = searchParams.get("status") || "all";

    if (!(await hasRoleFromRequest(request, "super_admin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user: _user },
    } = await supabase.auth.getUser();

    // Get all form types
    let formTypesQuery = supabase
      .from("form_types")
      .select("form_key, name, created_at, updated_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (search) {
      formTypesQuery = formTypesQuery.or(
        `name.ilike.%${search}%,form_key.ilike.%${search}%` as any,
      );
    }

    const { data: formTypes, error: formTypesError } = await formTypesQuery;

    if (formTypesError) {
      console.error("Error fetching form types:", formTypesError);
      return NextResponse.json(
        { error: "Failed to fetch form types" },
        { status: 500 },
      );
    }

    // Get email templates from normalized table
    const { data: emailRows, error: emailError } = await supabase
      .from("form_email_templates")
      .select(
        "form_key, template_type, subject_template, body_variables, is_active",
      );

    if (emailError) {
      console.error("Error fetching email templates:", emailError);
      return NextResponse.json(
        { error: "Failed to fetch email templates" },
        { status: 500 },
      );
    }

    // Build response with email status for each form
    const emailStatus =
      formTypes?.map((form) => {
        const rows = (emailRows || []).filter(
          (r) => r.form_key === form.form_key,
        );
        const byType: Record<string, any> = {};
        rows.forEach((r) => {
          byType[r.template_type] = r;
        });
        const templates = [
          byType["tracking"],
          byType["approval"],
          byType["rejection"],
          byType["update_request"],
        ].filter(Boolean);
        return {
          form_key: form.form_key,
          form_name: form.name,
          templates,
          has_templates: templates.length > 0,
        };
      }) || [];

    // Apply status filter
    let filtered = emailStatus;
    if (status === "configured")
      filtered = emailStatus.filter((e) => e.has_templates);
    if (status === "not_configured")
      filtered = emailStatus.filter((e) => !e.has_templates);

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginated = filtered.slice(startIndex, endIndex);
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limit);

    // Log access
    await audit.logAccess({
      action: "get_form_email_template_status",
      method: "GET",
      resource: "form_email_templates_status",
      result: "success",
      request_id: crypto.randomUUID(),
      meta: { form_count: formTypes?.length || 0 },
    });

    return NextResponse.json({
      success: true,
      emailStatus: paginated,
      totalItems,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error in form email templates status API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
