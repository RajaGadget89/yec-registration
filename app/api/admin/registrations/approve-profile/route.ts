import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { withAuditLogging } from "../../../../lib/audit/withAuditAccess";
import { safeLogAccess } from "../../../../lib/audit/safeAudit";

export const POST = withAuditLogging(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { registrationId, approvedBy, notes } = body;

    if (!registrationId) {
      return NextResponse.json(
        { error: "registrationId is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Look up the registration
    const { data: registration, error: fetchError } = await supabase
      .from("registrations")
      .select("id, email, status, profile_review_status")
      .eq("registration_id", registrationId)
      .single();

    if (fetchError || !registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );
    }

    // Update profile review status to approved
    const { data: updateResult, error: updateError } = await supabase
      .from("registrations")
      .update({
        profile_review_status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", (registration as any).id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating profile review status:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile review status" },
        { status: 500 },
      );
    }

    // Log the audit event
    await safeLogAccess({
      action: "approve_profile",
      method: "POST",
      resource: "/api/admin/registrations/approve-profile",
      result: "success",
      request_id: request.headers.get("x-request-id") || "unknown",
      meta: {
        registrationId,
        approvedBy,
        notes,
        eventType: "profile.approved",
        entityId: (registration as any).id,
      },
    });

    return NextResponse.json({
      success: true,
      approval: {
        type: "profile",
        status: "approved",
        approvedBy,
        notes,
      },
      registration: {
        id: (registration as any).id,
        email: (registration as any).email,
        status: updateResult.status,
      },
    });
  } catch (error) {
    console.error("Profile approval error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
