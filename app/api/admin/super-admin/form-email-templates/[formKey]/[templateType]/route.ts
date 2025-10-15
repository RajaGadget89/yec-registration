import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { audit } from "@/app/lib/audit";

interface RouteParams {
  params: {
    formKey: string;
    templateType: string;
  };
}

const VALID_TEMPLATE_TYPES = ["tracking", "approval", "rejection", "update_request"];

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { formKey, templateType } = params;
    
    if (!VALID_TEMPLATE_TYPES.includes(templateType)) {
      return NextResponse.json(
        { error: "Invalid template type" },
        { status: 400 }
      );
    }

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

    // Get email template configuration from form_types table
    const { data: formType, error: formError } = await supabase
      .from("form_types")
      .select("config")
      .eq("form_key", formKey)
      .eq("is_active", true)
      .single();

    if (formError || !formType) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      );
    }

    const emailTemplates = formType.config?.email_templates || {};
    const template = emailTemplates[templateType];

    // Log access
    await audit.logAccess({
      requestId: crypto.randomUUID(),
      actor: user.id,
      route: `/api/admin/super-admin/form-email-templates/${formKey}/${templateType}`,
      meta: { form_key: formKey, template_type: templateType, has_template: !!template },
    });

    return NextResponse.json({
      success: true,
      template: template || null,
    });
  } catch (error) {
    console.error("Error in email template API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { formKey, templateType } = params;
    const body = await request.json();
    const { template } = body;

    if (!VALID_TEMPLATE_TYPES.includes(templateType)) {
      return NextResponse.json(
        { error: "Invalid template type" },
        { status: 400 }
      );
    }

    if (!template) {
      return NextResponse.json(
        { error: "Template is required" },
        { status: 400 }
      );
    }

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

    // Validate form exists
    const { data: formType, error: formError } = await supabase
      .from("form_types")
      .select("id, config")
      .eq("form_key", formKey)
      .eq("is_active", true)
      .single();

    if (formError || !formType) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      );
    }

    // Update the form's config with the new email template
    const currentConfig = formType.config || {};
    const currentEmailTemplates = currentConfig.email_templates || {};
    
    const updatedConfig = {
      ...currentConfig,
      email_templates: {
        ...currentEmailTemplates,
        [templateType]: template,
      },
    };

    const { data, error } = await supabase
      .from("form_types")
      .update({
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("id", formType.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating email template:", error);
      return NextResponse.json(
        { error: "Failed to update email template" },
        { status: 500 }
      );
    }

    // Log event
    await audit.logEvent({
      correlationId: crypto.randomUUID(),
      eventType: "email_template_updated",
      entityId: formType.id,
      meta: {
        form_key: formKey,
        template_type: templateType,
        subject_template: template.subject_template,
        is_active: template.is_active,
        actor: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      template: data.config.email_templates[templateType],
    });
  } catch (error) {
    console.error("Error in email template update API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
