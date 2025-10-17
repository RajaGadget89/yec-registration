import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../lib/supabase/server";
import { audit } from "../../../../../lib/audit";
import { hasRoleFromRequest } from "../../../../../lib/auth-utils.server";

interface RouteParams {
  params: {
    formKey: string;
  };
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { formKey } = await (context as any).params;

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Allow admin or super_admin via centralized helper
    if (!(await hasRoleFromRequest(request, "admin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get form type basic info
    const { data: formType, error: formError } = await supabase
      .from("form_types")
      .select("form_key, name")
      .eq("form_key", formKey)
      .eq("is_active", true)
      .single();

    if (formError || !formType) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Read template from new table; fallback to legacy config if needed
    let template: any = null;
    const { data: badgeRow } = await supabase
      .from("form_badge_templates")
      .select("template")
      .eq("form_key", formKey)
      .eq("is_active", true)
      .maybeSingle();
    if (badgeRow?.template) {
      template = badgeRow.template;
    } else {
      const { data: legacy } = await supabase
        .from("form_types")
        .select("config")
        .eq("form_key", formKey)
        .single();
      template = legacy?.config?.badge_config || null;
    }

    // Log access
    await audit.logAccess({
      action: "GET",
      method: "GET",
      resource: `form-badge-templates-${formKey}`,
      result: "success",
      request_id: crypto.randomUUID(),
      meta: { form_key: formKey, template_requested: true },
    });

    return NextResponse.json({
      success: true,
      form: {
        form_key: formType.form_key,
        name: formType.name,
      },
      template,
    });
  } catch (error) {
    console.error("Error in badge template API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const { formKey } = await (context as any).params;
    const body = await request.json();
    const { template } = body;

    if (!template) {
      return NextResponse.json(
        { error: "Template is required" },
        { status: 400 },
      );
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await hasRoleFromRequest(request, "admin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate template structure
    const requiredFields = [
      "title_text",
      "background_color",
      "text_color",
      "fields",
    ];
    for (const field of requiredFields) {
      if (!template[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 },
        );
      }
    }

    // Upsert into form_badge_templates
    const { error: updateError } = await supabase
      .from("form_badge_templates")
      .upsert(
        {
          form_key: formKey,
          template,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "form_key" },
      );

    if (updateError) {
      console.error("Error updating badge template:", updateError);
      return NextResponse.json(
        { error: "Failed to update badge template" },
        { status: 500 },
      );
    }

    // Log access
    await audit.logAccess({
      action: "GET",
      method: "GET",
      resource: `form-badge-templates-${formKey}`,
      result: "success",
      request_id: crypto.randomUUID(),
      meta: {
        form_key: formKey,
        template_updated: true,
        template_fields: template.fields,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Badge template updated successfully",
    });
  } catch (error) {
    console.error("Error updating badge template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { formKey } = await (context as any).params;

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await hasRoleFromRequest(request, "admin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: updateError } = await supabase
      .from("form_badge_templates")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("form_key", formKey);

    if (updateError) {
      console.error("Error removing badge template:", updateError);
      return NextResponse.json(
        { error: "Failed to remove badge template" },
        { status: 500 },
      );
    }

    // Log access
    await audit.logAccess({
      action: "GET",
      method: "GET",
      resource: `form-badge-templates-${formKey}`,
      result: "success",
      request_id: crypto.randomUUID(),
      meta: {
        form_key: formKey,
        template_deleted: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Badge template removed successfully",
    });
  } catch (error) {
    console.error("Error removing badge template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
