import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { audit } from "@/app/lib/audit";

interface RouteParams {
  params: {
    formKey: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { formKey } = params;

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

    // Get form type and badge template
    const { data: formType, error: formError } = await supabase
      .from("form_types")
      .select("form_key, name, config")
      .eq("form_key", formKey)
      .eq("is_active", true)
      .single();

    if (formError || !formType) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      );
    }

    const template = formType.config?.badge_config || null;

    // Log access
    await audit.logAccess({
      requestId: crypto.randomUUID(),
      actor: user.id,
      route: `/api/admin/super-admin/form-badge-templates/${formKey}`,
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
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { formKey } = params;
    const body = await request.json();
    const { template } = body;

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

    if (!profile || profile.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate template structure
    const requiredFields = ["title_text", "background_color", "text_color", "fields"];
    for (const field of requiredFields) {
      if (!template[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Get current form config
    const { data: formType, error: formError } = await supabase
      .from("form_types")
      .select("config")
      .eq("form_key", formKey)
      .single();

    if (formError || !formType) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      );
    }

    // Update form config with badge template
    const updatedConfig = {
      ...formType.config,
      badge_config: template,
    };

    const { error: updateError } = await supabase
      .from("form_types")
      .update({
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("form_key", formKey);

    if (updateError) {
      console.error("Error updating badge template:", updateError);
      return NextResponse.json(
        { error: "Failed to update badge template" },
        { status: 500 }
      );
    }

    // Log access
    await audit.logAccess({
      requestId: crypto.randomUUID(),
      actor: user.id,
      route: `/api/admin/super-admin/form-badge-templates/${formKey}`,
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
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { formKey } = params;

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

    // Get current form config
    const { data: formType, error: formError } = await supabase
      .from("form_types")
      .select("config")
      .eq("form_key", formKey)
      .single();

    if (formError || !formType) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      );
    }

    // Remove badge config from form config
    const updatedConfig = { ...formType.config };
    delete updatedConfig.badge_config;

    const { error: updateError } = await supabase
      .from("form_types")
      .update({
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("form_key", formKey);

    if (updateError) {
      console.error("Error removing badge template:", updateError);
      return NextResponse.json(
        { error: "Failed to remove badge template" },
        { status: 500 }
      );
    }

    // Log access
    await audit.logAccess({
      requestId: crypto.randomUUID(),
      actor: user.id,
      route: `/api/admin/super-admin/form-badge-templates/${formKey}`,
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
      { status: 500 }
    );
  }
}
