import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../lib/supabase/server";
import { audit } from "../../../../../lib/audit";
import { hasRoleFromRequest } from "../../../../../lib/auth-utils.server";

export async function GET(request: NextRequest) {
  try {
    // Authorize as super admin using central auth utility (supports RBAC fallback)
    const isSuperAdmin = await hasRoleFromRequest(request, "super_admin");
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await getSupabaseServerClient();

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
        { status: 500 },
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
        { status: 500 },
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
    const pricingStatus =
      formTypes?.map((form) => {
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
      action: "get_pricing_status",
      method: "GET",
      resource: "form_pricing_status",
      result: "success",
      request_id: crypto.randomUUID(),
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
      { status: 500 },
    );
  }
}
