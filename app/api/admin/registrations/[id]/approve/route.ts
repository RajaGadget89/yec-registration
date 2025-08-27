import { NextRequest, NextResponse } from "next/server";
import { maybeServiceClient } from "../../../../../lib/supabase/server";
import { getCurrentUserFromRequest } from "../../../../../lib/auth-utils.server";
import { isAdmin } from "../../../../../lib/admin-guard";
import { EventService } from "../../../../../lib/events/eventService";
import { withAuditLogging } from "../../../../../lib/audit/withAuditAccess";
import { eventDrivenEmailService } from "../../../../../lib/emails/enhancedEmailService";

async function handlePOST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check admin authentication
    const user = await getCurrentUserFromRequest(request);
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { badgeUrl } = body;

    // Get appropriate Supabase client (service client if E2E bypass enabled)
    const supabase = await maybeServiceClient(request);

    // Load current registration
    const { data: registration, error: fetchError } = await supabase
      .from("registrations")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !registration) {
      console.error("Error fetching registration:", fetchError);
      return NextResponse.json(
        { ok: false, error: "Registration not found" },
        { status: 404 },
      );
    }

    // Call domain function for approval
    const { data: result, error: domainError } = await supabase.rpc(
      "fn_try_approve",
      {
        reg_id: id,
      },
    );

    if (domainError) {
      console.error("Domain function error:", domainError);
      return NextResponse.json(
        { ok: false, error: "Failed to approve registration" },
        { status: 500 },
      );
    }

    if (!result || result.length === 0 || !result[0].success) {
      console.error("Approval failed:", result);
      return NextResponse.json(
        { ok: false, error: "Approval processing failed" },
        { status: 500 },
      );
    }

    const approvalResult = result[0];
    void approvalResult; // used to satisfy lint without changing config

    // Send email notification using enhanced email service
    try {
      const brandTokens = eventDrivenEmailService.getBrandTokens();
      const emailResult = await eventDrivenEmailService.processEvent(
        "review.approved",
        registration,
        user.email,
        undefined, // no dimension for approvals
        undefined, // no notes for approvals
        badgeUrl, // badge URL for approval emails
        undefined, // no rejection reason for approvals
        brandTokens,
      );

      if (emailResult) {
        console.log("Approval email sent successfully:", {
          to: emailResult.to,
          template: emailResult.template,
          badgeUrl: emailResult.badgeUrl,
        });
      }
    } catch (emailError) {
      console.error("Error sending approval email:", emailError);
      // Don't fail the request if email fails
    }

    // Emit admin approved event for centralized side-effects
    try {
      if (!user.email) {
        throw new Error("Admin email is required");
      }
      await EventService.emitAdminApproved(registration, user.email);
      console.log("Admin approved event emitted successfully");
    } catch (eventError) {
      console.error("Error emitting admin approved event:", eventError);
      return NextResponse.json(
        { ok: false, error: "Failed to process approval" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      id: registration.id,
      status: "approved",
      badgeUrl: badgeUrl,
      message: "Registration approved successfully",
    });
  } catch (error) {
    console.error("Unexpected error in approve action:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withAuditLogging(handlePOST, {
  resource: "admin_approve",
});
