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
    const { formKey } = await params; // Next.js 15 dynamic params
    // Authorize via central helper (supports DB + RBAC)
    if (!(await hasRoleFromRequest(request, "super_admin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const supabase = await getSupabaseServerClient();
    const {
      data: { user: _user },
    } = await supabase.auth.getUser();

    // Prefer normalized table; fallback to JSON in form_types
    const { data: trackingRow, error: _trackingErr } = await supabase
      .from("form_tracking_configs")
      .select(
        "form_key, prefix, sequence_start, sequence_length, format, is_active",
      )
      .eq("form_key", formKey)
      .maybeSingle();

    const registrationIdConfig = trackingRow || null;

    // Log access
    await audit.logAccess({
      action: "get_tracking_id_config",
      method: "GET",
      resource: "form_tracking_id",
      result: "success",
      request_id: crypto.randomUUID(),
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
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { formKey } = await params; // Next.js 15 dynamic params
    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json(
        { error: "Configuration is required" },
        { status: 400 },
      );
    }

    // Authorize via central helper
    if (!(await hasRoleFromRequest(request, "super_admin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const supabase = await getSupabaseServerClient();
    const {
      data: { user: _user },
    } = await supabase.auth.getUser();

    // Mirror write: normalized table plus legacy JSON
    const { data: existing } = await supabase
      .from("form_tracking_configs")
      .select("form_key")
      .eq("form_key", formKey)
      .maybeSingle();

    const payload = {
      form_key: formKey,
      prefix: config.prefix,
      sequence_start: config.sequence_start,
      sequence_length: config.sequence_length,
      format: config.format,
      is_active: config.is_active,
      updated_at: new Date().toISOString(),
    } as any;

    if (existing) {
      const { error: updErr } = await supabase
        .from("form_tracking_configs")
        .update(payload)
        .eq("form_key", formKey);
      if (updErr) {
        console.error("Error updating form_tracking_configs:", updErr);
        return NextResponse.json(
          { error: "Failed to update tracking ID configuration" },
          { status: 500 },
        );
      }
    } else {
      const { error: insErr } = await supabase
        .from("form_tracking_configs")
        .insert({ ...payload, created_at: new Date().toISOString() });
      if (insErr) {
        console.error("Error inserting form_tracking_configs:", insErr);
        return NextResponse.json(
          { error: "Failed to update tracking ID configuration" },
          { status: 500 },
        );
      }
    }

    // Finalized: do not write legacy JSON into form_types.config anymore

    // Log event (normalized payload)
    await audit.logEvent({
      action: "update_tracking_id_config",
      resource: "form_tracking_id",
      resource_id: formKey,
      actor_id: _user?.id || "super_admin",
      actor_role: "admin",
      result: "success",
      correlation_id: crypto.randomUUID(),
      meta: {
        form_key: formKey,
        prefix: config.prefix,
        sequence_start: config.sequence_start,
        sequence_length: config.sequence_length,
        format: config.format,
        is_active: config.is_active,
      },
    });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("Error in tracking ID config update API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
