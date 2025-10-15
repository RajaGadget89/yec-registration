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

    // Get pricing status for each form
    const { data: pricingConfigs, error: pricingError } = await supabase
      .from("form_pricing_configs")
      .select("form_key, pricing_type, updated_at")
      .eq("is_active", true);

    if (pricingError) {
      console.error("Error fetching pricing configs:", pricingError);
      return NextResponse.json(
        { error: "Failed to fetch pricing configs" },
        { status: 500 }
      );
    }

    // Create pricing status map
    const pricingStatusMap = new Map();
    pricingConfigs?.forEach((config) => {
      pricingStatusMap.set(config.form_key, {
        pricing_type: config.pricing_type,
        last_updated: config.updated_at,
      });
    });

    // Build response with pricing status for each form
    const pricingStatus = formTypes?.map((form) => {
      const pricingInfo = pricingStatusMap.get(form.form_key);
      return {
        form_key: form.form_key,
        form_name: form.name,
        has_pricing: !!pricingInfo,
        pricing_type: pricingInfo?.pricing_type,
        last_updated: pricingInfo?.last_updated,
      };
    }) || [];

    // Log access
    await audit.logAccess({
      requestId: crypto.randomUUID(),
      actor: user.id,
      route: "/api/admin/super-admin/form-pricing/status",
      meta: { form_count: formTypes?.length || 0 },
    });

    return NextResponse.json({
      success: true,
      pricingStatus,
    });
  } catch (error) {
    console.error("Error in form pricing status API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
