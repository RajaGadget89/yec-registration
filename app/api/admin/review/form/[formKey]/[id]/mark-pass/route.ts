import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../../lib/supabase/server";
import { audit } from "../../../../../../../lib/audit";
import { formApprovalService } from "../../../../../../../lib/form-system/formApprovalService";

interface RouteParams {
  params: {
    formKey: string;
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { formKey, id } = params;
    const body = await request.json();
    const { dimension } = body;

    if (!dimension || !dimension.trim()) {
      return NextResponse.json(
        { error: "Dimension is required" },
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

    // Check if user has admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate form and registration exist
    const { data: registration, error: regError } = await supabase
      .from("form_registrations")
      .select("id, status")
      .eq("id", id)
      .eq("form_key", formKey)
      .single();

    if (regError || !registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );
    }

    // Check if already processed
    if (
      registration.status === "approved" ||
      registration.status === "rejected"
    ) {
      return NextResponse.json(
        { error: `Registration is already ${registration.status}` },
        { status: 400 },
      );
    }

    // Mark dimension as passed
    const result = await formApprovalService.markDimensionPass(
      formKey,
      id,
      dimension,
      user.id,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    // Log access
    await audit.logAccess({
      action: "POST",
      method: "POST",
      resource: `form-${formKey}-mark-pass`,
      result: "success",
      request_id: crypto.randomUUID(),
      meta: {
        form_key: formKey,
        registration_id: id,
        dimension,
      },
    });

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error in form dimension pass API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
