import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";
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
    const { dimension, notes } = body;

    // Validate dimension
    if (!dimension || !["payment", "profile", "tcc"].includes(dimension)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid dimension. Must be payment, profile, or tcc",
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

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

    // Call domain function for request update
    const { data: result, error: domainError } = await supabase.rpc(
      "fn_request_update",
      {
        reg_id: id,
        dimension: dimension,
        reviewer_id: user.email,
        notes: notes || null,
      },
    );

    if (domainError) {
      console.error("Domain function error:", domainError);
      return NextResponse.json(
        { ok: false, error: "Failed to request update" },
        { status: 500 },
      );
    }

    if (!result || result.length === 0 || !result[0].success) {
      console.error("Request update failed:", result);
      return NextResponse.json(
        { ok: false, error: "Request update processing failed" },
        { status: 500 },
      );
    }

    const updateResult = result[0];

    // Send email notification using enhanced email service
    try {
      const brandTokens = eventDrivenEmailService.getBrandTokens();
      const emailResult = await eventDrivenEmailService.processEvent(
        "review.request_update",
        registration,
        user.email,
        dimension,
        notes,
        undefined, // no badge URL for update requests
        undefined, // no rejection reason for update requests
        brandTokens,
      );

      if (emailResult) {
        console.log("Update request email sent successfully:", {
          to: emailResult.to,
          template: emailResult.template,
          ctaUrl: emailResult.ctaUrl,
        });
      }
    } catch (emailError) {
      console.error("Error sending update request email:", emailError);
      // Don't fail the request if email fails
    }

    // Emit admin request update event for centralized side-effects
    try {
      if (!user.email) {
        throw new Error("Admin email is required");
      }
      await EventService.emitAdminRequestUpdate(
        registration,
        user.email,
        dimension,
        notes,
      );
      console.log("Admin request update event emitted successfully");
    } catch (eventError) {
      console.error("Error emitting admin request update event:", eventError);
      // Don't fail the request if event emission fails
    }

    return NextResponse.json({
      ok: true,
      id: registration.id,
      status: updateResult.new_status,
      dimension: dimension,
      notes: notes,
      message: `Update requested for ${dimension} dimension`,
    });
  } catch (error) {
    console.error("Unexpected error in request update action:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withAuditLogging(handlePOST, {
  resource: "admin_request_update",
});
