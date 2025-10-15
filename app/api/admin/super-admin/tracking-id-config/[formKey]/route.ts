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

    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get tracking ID configuration from form_types table
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

    const registrationIdConfig = formType.config?.registration_id_config;

    // Log access
    await audit.logAccess({
      requestId: crypto.randomUUID(),
      actor: user.id,
      route: `/api/admin/super-admin/tracking-id-config/${formKey}`,
      meta: { form_key: formKey, has_config: !!registrationIdConfig },
    });

    return NextResponse.json({
      success: true,
      config: registrationIdConfig || null,
    });
  } catch (error) {
    console.error("Error in tracking ID config API:", error);
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
    const { config } = body;

    if (!config) {
      return NextResponse.json(
        { error: "Configuration is required" },
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

    // Update the form's config with the new registration_id_config
    const updatedConfig = {
      ...formType.config,
      registration_id_config: config,
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
      console.error("Error updating tracking ID config:", error);
      return NextResponse.json(
        { error: "Failed to update tracking ID configuration" },
        { status: 500 }
      );
    }

    // Log event
    await audit.logEvent({
      correlationId: crypto.randomUUID(),
      eventType: "tracking_id_config_updated",
      entityId: formType.id,
      meta: {
        form_key: formKey,
        prefix: config.prefix,
        sequence_start: config.sequence_start,
        sequence_length: config.sequence_length,
        format: config.format,
        is_active: config.is_active,
        actor: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      config: data.config.registration_id_config,
    });
  } catch (error) {
    console.error("Error in tracking ID config update API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
