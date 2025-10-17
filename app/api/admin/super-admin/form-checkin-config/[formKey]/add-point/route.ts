import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../lib/supabase/server";
import { audit } from "../../../../../../lib/audit";
import { formCheckinService } from "../../../../../../lib/form-system/formCheckinService";

interface RouteParams {
  params: {
    formKey: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { formKey } = params;
    const body = await request.json();
    const { checkin_event_id } = body;

    if (!checkin_event_id) {
      return NextResponse.json(
        { error: "Check-in event ID is required" },
        { status: 400 },
      );
    }

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

    // Add check-in point
    const result = await formCheckinService.addCheckinPoint(
      formKey,
      checkin_event_id,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    // Get the created point ID for response
    const { data: point, error: _pointError } = await supabase
      .from("form_checkin_points")
      .select("id")
      .eq("form_key", formKey)
      .eq("checkin_event_id", checkin_event_id)
      .single();

    // Log access
    await audit.logAccess({
      action: "POST",
      method: "POST",
      resource: `form-checkin-config-${formKey}-add-point`,
      result: "success",
      request_id: crypto.randomUUID(),
      meta: {
        form_key: formKey,
        checkin_event_id,
        point_added: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      pointId: point?.id,
    });
  } catch (error) {
    console.error("Error adding check-in point:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
