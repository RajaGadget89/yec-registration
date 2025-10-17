import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../lib/supabase/server";
import { audit } from "../../../../../lib/audit";
import { formCheckinService } from "../../../../../lib/form-system/formCheckinService";

interface RouteParams {
  params: {
    formKey: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { formKey } = params;

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

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

    // Get form check-in configuration
    const config = await formCheckinService.getFormCheckinConfig(formKey);

    if (!config) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Log access
    await audit.logAccess({
      action: "GET",
      method: "GET",
      resource: `form-checkin-config-${formKey}`,
      result: "success",
      request_id: crypto.randomUUID(),
      meta: { form_key: formKey, config_requested: true },
    });

    return NextResponse.json({
      success: true,
      form: {
        form_key: config.form_key,
        name: config.form_name,
      },
      currentPoints: config.checkin_points,
      availableEvents: config.available_events,
    });
  } catch (error) {
    console.error("Error in form check-in config API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
