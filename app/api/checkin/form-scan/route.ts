import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { audit } from "../../../lib/audit";
import { formCheckinService } from "../../../lib/form-system/formCheckinService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tracking_id, checkin_event_id, form_key: _form_key } = body;

    if (!tracking_id || !checkin_event_id) {
      return NextResponse.json(
        { error: "Tracking ID and check-in event ID are required" },
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

    // Check if user has checker role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      !["checker", "admin", "super_admin"].includes(profile.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check-in the registration
    const result = await formCheckinService.checkinRegistration(
      tracking_id,
      checkin_event_id,
      user.id,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    // Log access
    await audit.logAccess({
      action: "POST",
      method: "POST",
      resource: "form-checkin-scan",
      result: "success",
      request_id: crypto.randomUUID(),
      meta: {
        tracking_id,
        checkin_event_id,
        form_key: result.form_type,
        checkin_completed: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      registration: result.registration,
      form_type: result.form_type,
    });
  } catch (error) {
    console.error("Error in form check-in scan API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
