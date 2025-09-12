import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { withAuditLogging } from "../../../../lib/audit/withAuditAccess";
import { safeLogAccess } from "../../../../lib/audit/safeAudit";

export const POST = withAuditLogging(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { registrationId, rejectedBy, reason, track } = body;

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
      .select("id, email, status, tcc_review_status")
      .eq("registration_id", registrationId)
      .single();

    if (fetchError || !registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );
    }

    // Update TCC review status to rejected
    const { data: updateResult, error: updateError } = await supabase
      .from("registrations")
      .update({
        tcc_review_status: "rejected",
        rejected_reason: reason || "TCC card image unclear or invalid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", (registration as any).id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating TCC review status:", updateError);
      return NextResponse.json(
        { error: "Failed to update TCC review status" },
        { status: 500 },
      );
    }

    // Log the audit event
    await safeLogAccess({
      action: "reject_tcc",
      method: "POST",
      resource: "/api/admin/registrations/reject-tcc",
      result: "success",
      request_id: request.headers.get("x-request-id") || "unknown",
      meta: {
        registrationId,
        rejectedBy,
        reason,
        track,
        eventType: "tcc.rejected",
        entityId: (registration as any).id,
      },
    });

    return NextResponse.json({
      success: true,
      rejection: {
        type: "tcc",
        status: "rejected",
        rejectedBy,
        reason,
      },
      registration: {
        id: (registration as any).id,
        email: (registration as any).email,
        status: updateResult.status,
      },
    });
  } catch (error) {
    console.error("TCC rejection error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
