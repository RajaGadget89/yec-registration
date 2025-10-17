import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../lib/supabase/server";
import { audit } from "../../../../../lib/audit";
import { hasRoleFromRequest } from "../../../../../lib/auth-utils.server";

interface RouteParams {
  params: {
    formKey: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { formKey } = await params;
    // Authorize as super admin using central auth utility
    const isSuperAdmin = await hasRoleFromRequest(request, "super_admin");
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const supabase = await getSupabaseServerClient();

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
        { status: 500 },
      );
    }

    // Log access
    await audit.logAccess({
      action: "get_pricing_config",
      method: "GET",
      resource: "form_pricing",
      result: "success",
      request_id: crypto.randomUUID(),
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
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { formKey } = await params;
    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json(
        { error: "Configuration is required" },
        { status: 400 },
      );
    }

    // Authorize as super admin using central auth utility
    const isSuperAdmin = await hasRoleFromRequest(request, "super_admin");
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const supabase = await getSupabaseServerClient();

    // Validate form exists
    const { data: formType, error: formError } = await supabase
      .from("form_types")
      .select("id")
      .eq("form_key", formKey)
      .eq("is_active", true)
      .single();

    if (formError || !formType) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
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
        { status: 500 },
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
          { status: 500 },
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
          { status: 500 },
        );
      }

      result = data;
    }

    // Log event
    await audit.logEvent({
      action: "update_pricing_config",
      resource: "form_pricing",
      resource_id: result.id,
      actor_id: "super_admin",
      actor_role: "admin",
      result: "success",
      correlation_id: crypto.randomUUID(),
      meta: {
        form_key: formKey,
        pricing_type: config.pricing_type,
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
      { status: 500 },
    );
  }
}
