import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";
import { hasBusinessRole } from "../../../../../lib/rbac";
import { EventService } from "../../../../../lib/events/eventService";
import { withAuditLogging } from "../../../../../lib/audit/withAuditAccess";

async function handlePOST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    // Get admin email from cookies (same approach as /api/admin/me)
    const adminEmail = request.cookies.get("admin-email")?.value;
    console.log(`[MARK_PASS_API] Admin email from cookies: ${adminEmail}`);
    if (!adminEmail) {
      console.log(`[MARK_PASS_API] No admin email found in cookies`);
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get database user information to check admin status
    const supabase = getSupabaseServiceClient();
    console.log(
      `[MARK_PASS_API] Looking up admin user: ${adminEmail.toLowerCase()}`,
    );
    const { data: adminUser, error: userError } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", adminEmail.toLowerCase())
      .eq("is_active", true)
      .single();

    console.log(
      `[MARK_PASS_API] Database lookup result: ${adminUser ? "found" : "not found"}, error: ${userError?.message}`,
    );
    if (userError || !adminUser) {
      console.log(
        `[MARK_PASS_API] Admin user not found or error: ${userError?.message}`,
      );
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const user = {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      business_roles: adminUser.business_roles || [],
      is_active: adminUser.is_active,
    };

    const { id } = await ctx.params;
    const body = await request.json();
    const { dimension } = body as { dimension: "payment" | "profile" | "tcc" };

    // Validate dimension
    if (!dimension || !["payment", "profile", "tcc"].includes(dimension)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid dimension",
        },
        { status: 400 },
      );
    }

    // Check business role permissions for the specific dimension
    const businessRoleMap = {
      payment: "payment_slip" as const,
      profile: "user_profile" as const,
      tcc: "tcc_card" as const,
    };

    const requiredBusinessRole = businessRoleMap[dimension];
    const hasRequiredRole = await hasBusinessRole(
      user.email,
      requiredBusinessRole,
    );

    if (!hasRequiredRole) {
      return NextResponse.json(
        {
          error: "insufficient permissions",
          message: `Admin does not have ${requiredBusinessRole} scope`,
        },
        { status: 403 },
      );
    }

    // Use existing supabase client (already created above)

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

    // Update the specific dimension to passed
    const currentChecklist = registration.review_checklist || {
      payment: { status: "pending" },
      profile: { status: "pending" },
      tcc: { status: "pending" },
    };

    // Update the specific dimension
    currentChecklist[dimension] = { status: "passed" };

    // Update registration with new checklist and sync scalar statuses
    const { deriveScalarStatuses } = await import(
      "../../../../../lib/reviewStatusMapper"
    );
    const scalarStatuses = deriveScalarStatuses(currentChecklist as any);
    const { data: updatedRegistration, error: updateError } = await (
      supabase as any
    )
      .from("registrations")
      .update({
        review_checklist: currentChecklist,
        updated_at: new Date().toISOString(),
        payment_review_status: scalarStatuses.payment_review_status,
        profile_review_status: scalarStatuses.profile_review_status,
        tcc_review_status: scalarStatuses.tcc_review_status,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating registration:", updateError);
      return NextResponse.json(
        { ok: false, error: "Failed to mark dimension as passed" },
        { status: 500 },
      );
    }

    // Check if all dimensions are now passed (auto-approve)
    const allPassed =
      currentChecklist.payment.status === "passed" &&
      currentChecklist.profile.status === "passed" &&
      currentChecklist.tcc.status === "passed";

    console.log(
      `🔍 Dimension ${dimension} marked as passed. All dimensions passed: ${allPassed}`,
    );
    console.log(`🔍 Current checklist status:`, {
      payment: currentChecklist.payment.status,
      profile: currentChecklist.profile.status,
      tcc: currentChecklist.tcc.status,
    });

    let finalStatus = updatedRegistration.status;
    if (allPassed) {
      console.log(
        `🚀 All dimensions passed! Attempting auto-approval for registration: ${id}`,
      );

      // Auto-approve
      const { data: approveResult, error: approveError } = await (
        supabase as any
      ).rpc("fn_try_approve", { reg_id: id });

      console.log(`🔍 fn_try_approve result:`, {
        error: approveError,
        result: approveResult,
        success: approveResult?.[0]?.success,
      });

      if (
        !approveError &&
        approveResult &&
        approveResult.length > 0 &&
        approveResult[0].success
      ) {
        finalStatus = "approved";

        // ✅ CRITICAL FIX: Fetch FRESH registration data after approval
        console.log(
          `🔄 Fetching fresh registration data after approval for: ${id}`,
        );
        const { data: freshRegistration, error: freshError } = await supabase
          .from("registrations")
          .select("*")
          .eq("id", id)
          .single();

        if (freshError) {
          console.error(
            "❌ Failed to fetch fresh registration data:",
            freshError,
          );
        } else {
          console.log(`✅ Fresh registration data fetched:`, {
            id: freshRegistration.id,
            registration_id: freshRegistration.registration_id,
            status: freshRegistration.status,
            first_name: freshRegistration.first_name,
            last_name: freshRegistration.last_name,
          });
        }

        // Outbox-only: emit event to enqueue approval-badge
        try {
          if (!user.email) {
            throw new Error("Admin email is required");
          }
          // ✅ CRITICAL FIX: Use FRESH registration data, not stale updatedRegistration
          const registrationForEvent = freshError
            ? updatedRegistration
            : freshRegistration;
          await EventService.emitAdminApproved(
            registrationForEvent,
            user.email,
          );
          console.log(
            "Admin approved event emitted (outbox enqueue) with fresh data",
          );
        } catch (eventError) {
          console.error("Error emitting admin approved event:", eventError);
        }

        // Auto-dispatch a small batch so email sends immediately without manual action
        try {
          const { dispatchEmailBatch } = await import(
            "../../../../../lib/emails/dispatcher"
          );
          await dispatchEmailBatch(10, false);
        } catch (dispatchError) {
          console.warn(
            "Auto-dispatch after approval failed (will be sent by cron/widget):",
            dispatchError,
          );
        }
      }
    }

    // Emit admin mark pass event for centralized side-effects
    try {
      if (!user.email) {
        throw new Error("Admin email is required");
      }
      await EventService.emitAdminMarkPass(registration, user.email, dimension);
      console.log("Admin mark pass event emitted successfully");
    } catch (eventError) {
      console.error("Error emitting admin mark pass event:", eventError);
      // Don't fail the request if event emission fails
    }

    return NextResponse.json({
      ok: true,
      id: registration.id,
      status: finalStatus,
      dimension: dimension,
      all_passed: allPassed,
      message: `Dimension ${dimension} marked as passed${allPassed ? " - Registration auto-approved" : ""}`,
    });
  } catch (error) {
    console.error("Unexpected error in mark pass action:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Export the wrapped handler
export const POST = withAuditLogging(handlePOST, {
  resource: "admin/mark-pass",
});
