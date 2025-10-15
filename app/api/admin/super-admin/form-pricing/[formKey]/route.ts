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

    // Get pricing configuration for the form
    const { data: pricingConfig, error: pricingError } = await supabase
      .from("form_pricing_configs")
      .select("*")
      .eq("form_key", formKey)
      .eq("is_active", true)
      .single();

    if (pricingError && pricingError.code !== "PGRST116") {
      console.error("Error fetching pricing config:", pricingError);
      return NextResponse.json(
        { error: "Failed to fetch pricing configuration" },
        { status: 500 }
      );
    }

    // Log access
    await audit.logAccess({
      requestId: crypto.randomUUID(),
      actor: user.id,
      route: `/api/admin/super-admin/form-pricing/${formKey}`,
      meta: { form_key: formKey, has_config: !!pricingConfig },
    });

    return NextResponse.json({
      success: true,
      config: pricingConfig?.config || null,
    });
  } catch (error) {
    console.error("Error in form pricing config API:", error);
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
      .select("id")
      .eq("form_key", formKey)
      .eq("is_active", true)
      .single();

    if (formError || !formType) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      );
    }

    // Check if pricing config already exists
    const { data: existingConfig, error: existingError } = await supabase
      .from("form_pricing_configs")
      .select("id")
      .eq("form_key", formKey)
      .eq("is_active", true)
      .single();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("Error checking existing config:", existingError);
      return NextResponse.json(
        { error: "Failed to check existing configuration" },
        { status: 500 }
      );
    }

    let result;
    if (existingConfig) {
      // Update existing configuration
      const { data, error } = await supabase
        .from("form_pricing_configs")
        .update({
          config,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConfig.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating pricing config:", error);
        return NextResponse.json(
          { error: "Failed to update pricing configuration" },
          { status: 500 }
        );
      }

      result = data;
    } else {
      // Create new configuration
      const { data, error } = await supabase
        .from("form_pricing_configs")
        .insert({
          form_key: formKey,
          pricing_type: config.pricing_type,
          config,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating pricing config:", error);
        return NextResponse.json(
          { error: "Failed to create pricing configuration" },
          { status: 500 }
        );
      }

      result = data;
    }

    // Log event
    await audit.logEvent({
      correlationId: crypto.randomUUID(),
      eventType: "pricing_config_updated",
      entityId: result.id,
      meta: {
        form_key: formKey,
        pricing_type: config.pricing_type,
        actor: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      config: result,
    });
  } catch (error) {
    console.error("Error in form pricing config update API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
