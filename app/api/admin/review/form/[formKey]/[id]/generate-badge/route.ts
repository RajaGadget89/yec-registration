import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { audit } from "@/app/lib/audit";
import { formBadgeService } from "@/app/lib/form-system/formBadgeService";

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

    // Get registration data
    const { data: registration, error: regError } = await supabase
      .from("form_registrations")
      .select("*")
      .eq("id", id)
      .eq("form_key", formKey)
      .single();

    if (regError || !registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    // Check if badge already exists
    if (registration.badge_path) {
      return NextResponse.json(
        { error: "Badge already exists for this registration" },
        { status: 400 }
      );
    }

    // Generate badge
    const result = await formBadgeService.generateBadge(
      formKey,
      id,
      registration
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to generate badge" },
        { status: 500 }
      );
    }

    // Log access
    await audit.logAccess({
      requestId: crypto.randomUUID(),
      actor: user.id,
      route: `/api/admin/review/form/${formKey}/${id}/generate-badge`,
      meta: {
        form_key: formKey,
        registration_id: id,
        badge_generated: true,
        badge_path: result.badge_path,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Badge generated successfully",
      badge_path: result.badge_path,
      badge_url: result.badge_url,
    });
  } catch (error) {
    console.error("Error generating badge:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
