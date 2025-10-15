import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { audit } from "@/app/lib/audit";
import { formApprovalService } from "@/app/lib/form-system/formApprovalService";

interface RouteParams {
  params: {
    formKey: string;
    id: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { formKey, id } = params;
    const body = await request.json();
    const { notes } = body;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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
        { status: 404 }
      );
    }

    // Check if already approved
    if (registration.status === "approved") {
      return NextResponse.json(
        { error: "Registration is already approved" },
        { status: 400 }
      );
    }

    // Approve the registration
    const result = await formApprovalService.approveRegistration(
      formKey,
      id,
      user.id,
      notes
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    // Log access
    await audit.logAccess({
      requestId: crypto.randomUUID(),
      actor: user.id,
      route: `/api/admin/review/form/${formKey}/${id}/approve`,
      meta: {
        form_key: formKey,
        registration_id: id,
        approval_notes: notes,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Registration approved successfully",
    });
  } catch (error) {
    console.error("Error in form approval API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
