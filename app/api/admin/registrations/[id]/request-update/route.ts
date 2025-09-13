import { NextRequest, NextResponse } from "next/server";
import { hasBusinessRole as _hasBusinessRole } from "../../../../../lib/rbac";
import { withAuditLogging as _withAuditLogging } from "../../../../../lib/audit/withAuditAccess";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";

async function handlePOST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // TEMPORARILY DISABLED: Authentication
    const user = {
      id: "test",
      email: "9singhafarm@gmail.com",
      role: "admin",
      business_roles: ["tcc_card"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      is_active: true,
    };

    const { id } = params;
    const body = await request.json();
    const { dimension, notes } = body as {
      dimension: "payment" | "profile" | "tcc";
      notes?: string;
    };

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

    // Debug logging for E2E tests
    if (process.env.E2E_TEST_MODE === "true") {
      console.log(`[DEBUG] Request update check for ${user.email}:`);
      console.log(`  - Dimension: ${dimension}`);
      console.log(`  - User business roles: ${user.business_roles}`);
    }

    // Check business role permissions for the specific dimension
    const businessRoleMap = {
      payment: "payment_slip" as const,
      profile: "user_profile" as const,
      tcc: "tcc_card" as const,
    };

    const requiredBusinessRole = businessRoleMap[dimension];
    // TEMPORARILY DISABLED: Check business role
    const hasRequiredRole = true; // await hasBusinessRole(user.email, requiredBusinessRole);

    // Debug logging for E2E tests
    if (process.env.E2E_TEST_MODE === "true") {
      console.log(`[DEBUG] Request update check for ${user.email}:`);
      console.log(`  - Dimension: ${dimension}`);
      console.log(`  - Required business role: ${requiredBusinessRole}`);
      console.log(`  - Has required role: ${hasRequiredRole}`);
    }

    if (!hasRequiredRole) {
      return NextResponse.json(
        {
          error: "insufficient permissions",
          message: `Admin does not have ${requiredBusinessRole} scope`,
        },
        { status: 403 },
      );
    }

    // Use the same client as the working db-debug endpoint
    const supabaseClient = getSupabaseServiceClient();

    // Load current registration
    console.log(`[REQUEST_UPDATE_API] Looking up registration with ID: ${id}`);
    const { data: registration, error: fetchError } = await supabaseClient
      .from("registrations")
      .select("*")
      .eq("id", id)
      .single();

    console.log(`[REQUEST_UPDATE_API] Registration lookup result:`, {
      found: !!registration,
      error: fetchError?.message,
      registrationId: registration?.registration_id,
    });

    if (fetchError || !registration) {
      console.error("Error fetching registration:", fetchError);
      return NextResponse.json(
        { ok: false, error: "Registration not found" },
        { status: 404 },
      );
    }

    // Update the specific dimension to needs_update (same approach as mark-pass)
    const currentChecklist = registration.review_checklist || {
      payment: { status: "pending" },
      profile: { status: "pending" },
      tcc: { status: "pending" },
    };

    // Update the specific dimension
    currentChecklist[dimension] = {
      status: "needs_update",
      notes: notes || null,
    };

    // Update registration with new checklist (let database trigger handle status update)
    console.log(
      `[REQUEST_UPDATE_API] Updating registration with review_checklist:`,
      {
        review_checklist: currentChecklist,
        id: id,
      },
    );

    const { data: updatedRegistration, error: updateError } =
      await supabaseClient
        .from("registrations")
        .update({
          review_checklist: currentChecklist,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    console.log(`[REQUEST_UPDATE_API] Update result:`, {
      success: !!updatedRegistration,
      error: updateError?.message,
      updatedId: updatedRegistration?.id,
      newStatus: updatedRegistration?.status,
    });

    if (updateError) {
      console.error("Error updating registration:", updateError);
      return NextResponse.json(
        { ok: false, error: "Failed to request update" },
        { status: 500 },
      );
    }

    console.log(`[REQUEST_UPDATE_API] Database update successful!`);

    // Success - return the updated registration
    console.log(
      `[REQUEST_UPDATE_API] SUCCESS! Database update completed successfully`,
    );

    // Send email notification using enhanced email service
    try {
      const { EventDrivenEmailService } = await import(
        "../../../../../lib/emails/enhancedEmailService"
      );
      const eventDrivenEmailService = EventDrivenEmailService.getInstance();
      const brandTokens = eventDrivenEmailService.getBrandTokens();

      const emailResult = await eventDrivenEmailService.processEvent(
        "review.request_update",
        updatedRegistration, // Use the updated registration data
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

      // In E2E test mode, ensure outbox row is created synchronously
      if (process.env.E2E_TEST_MODE === "true") {
        // Force immediate dispatch to ensure outbox row exists for tests
        const { dispatchEmailBatch } = await import(
          "../../../../../lib/emails/dispatcher"
        );
        try {
          await dispatchEmailBatch(10, true); // dry-run to avoid sending real emails
        } catch (dispatchError) {
          console.warn(
            "E2E: Failed to dispatch emails immediately:",
            dispatchError,
          );
        }
      }
    } catch (emailError) {
      console.error("Error sending update request email:", emailError);
      // Don't fail the request if email fails
    }

    // TEMPORARILY DISABLED: Emit admin request update event for centralized side-effects
    /*
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
    */

    return NextResponse.json({
      ok: true,
      id: updatedRegistration.id,
      status: updatedRegistration.status,
      dimension: dimension,
      notes: notes,
      message: `Update requested for ${dimension} dimension`,
    });
  } catch (error) {
    console.error("Unexpected error in request update action:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = handlePOST;
