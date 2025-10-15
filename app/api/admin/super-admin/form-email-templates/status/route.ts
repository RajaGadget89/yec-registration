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

    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all form types
    const { data: formTypes, error: formTypesError } = await supabase
      .from("form_types")
      .select("form_key, name, created_at, updated_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (formTypesError) {
      console.error("Error fetching form types:", formTypesError);
      return NextResponse.json(
        { error: "Failed to fetch form types" },
        { status: 500 }
      );
    }

    // Get email template configurations
    const { data: emailConfigs, error: emailError } = await supabase
      .from("form_types")
      .select(`
        form_key,
        config->email_templates as email_templates
      `)
      .eq("is_active", true);

    if (emailError) {
      console.error("Error fetching email configs:", emailError);
      return NextResponse.json(
        { error: "Failed to fetch email configurations" },
        { status: 500 }
      );
    }

    // Build response with email status for each form
    const emailStatus = formTypes?.map((form) => {
      const emailConfig = emailConfigs?.find(ec => ec.form_key === form.form_key);
      const emailTemplates = emailConfig?.email_templates || {};
      
      const templates = [
        { template_type: "tracking", ...emailTemplates.tracking },
        { template_type: "approval", ...emailTemplates.approval },
        { template_type: "rejection", ...emailTemplates.rejection },
        { template_type: "update_request", ...emailTemplates.update_request },
      ].filter(template => template.subject_template && template.body_variables);

      return {
        form_key: form.form_key,
        form_name: form.name,
        templates,
        has_templates: templates.length > 0,
      };
    }) || [];

    // Log access
    await audit.logAccess({
      requestId: crypto.randomUUID(),
      actor: user.id,
      route: "/api/admin/super-admin/form-email-templates/status",
      meta: { form_count: formTypes?.length || 0 },
    });

    return NextResponse.json({
      success: true,
      emailStatus,
    });
  } catch (error) {
    console.error("Error in form email templates status API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
