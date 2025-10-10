import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withRequestContext } from "../../../../_lib/withRequestContext";
import { withAuditLogging } from "../../../../_lib/withAuditLogging";
import { withSuperAdminApiGuard } from "../../../../_lib/withSuperAdminApiGuard";
import {
  safeLogAccess,
  safeLogEvent,
} from "../../../../../lib/audit/safeAudit";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";
import { EventService } from "../../../../../lib/events/eventService";
import { EventFactory } from "../../../../../lib/events/eventFactory";
import { isFeatureEnabled, FEATURES } from "../../../../../lib/features";
import {
  buildDeletePlan,
  executeDeletePlan,
} from "../../../../../lib/admin-delete-utils";
import {
  saveArtifact,
  formatTimestampForDir,
} from "../../../../../lib/artifacts-utils";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  business_roles: z
    .array(
      z.enum([
        "user_profile",
        "payment_slip",
        "tcc_card",
        "checker_admin",
        "cms_admin",
      ]),
    )
    .optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Check feature flag
  if (!isFeatureEnabled(FEATURES.ADMIN_MANAGEMENT)) {
    return NextResponse.json(
      { error: "Feature not available" },
      { status: 404 },
    );
  }

  try {
    const { id: adminId } = await params;
    if (!adminId) {
      return NextResponse.json(
        { error: "Admin ID is required" },
        { status: 400 },
      );
    }

    // Guard: Check admin authentication - try header first (for E2E), then cookie
    let adminEmail: string | null = request.headers.get("admin-email");

    if (!adminEmail) {
      adminEmail = request.cookies.get("admin-email")?.value || null;
    }

    if (!adminEmail) {
      return NextResponse.json(
        {
          error: "Unauthorized. Admin access required.",
          code: "ADMIN_ACCESS_REQUIRED",
        },
        { status: 401 },
      );
    }

    // Validate admin is in allowlist and has super_admin role
    const supabase = getSupabaseServiceClient();

    const { data: adminUser, error: adminError } = await supabase
      .from("admin_users")
      .select("id, role, status")
      .eq("email", adminEmail)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json(
        {
          error: "Unauthorized. Admin access required.",
          code: "ADMIN_ACCESS_REQUIRED",
        },
        { status: 401 },
      );
    }

    if ((adminUser as any).role !== "super_admin") {
      return NextResponse.json(
        {
          error: "Forbidden: Super admin access required",
          code: "SUPER_ADMIN_REQUIRED",
        },
        { status: 403 },
      );
    }

    if ((adminUser as any).status !== "active") {
      return NextResponse.json(
        {
          error: "Forbidden: Admin account is not active",
          code: "ADMIN_INACTIVE",
        },
        { status: 403 },
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validationResult = updateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          error: "Invalid request data",
          details: validationResult.error.errors,
        },
        { status: 422 },
      );
    }

    const validatedData = validationResult.data;

    // Validate that at least one update is provided
    if (!validatedData.business_roles && !validatedData.status) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          error: "No valid updates provided",
        },
        { status: 422 },
      );
    }

    // Get current admin state
    const { data: currentAdmin, error: fetchError } = await supabase
      .from("admin_users")
      .select("*")
      .eq("id", adminId)
      .single();

    if (fetchError || !currentAdmin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    // Prevent self-modification
    if (adminId === (adminUser as any).id) {
      return NextResponse.json(
        { error: "Cannot modify your own account" },
        { status: 400 },
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (validatedData.business_roles) {
      updateData.business_roles = validatedData.business_roles;
    }
    if (validatedData.status) {
      updateData.status = validatedData.status;
    }

    // Perform database update
    const { data: updatedAdmin, error: updateError } = await (supabase as any)
      .from("admin_users")
      .update(updateData as any)
      .eq("id", adminId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating admin:", updateError);
      return NextResponse.json(
        { error: "Failed to update admin" },
        { status: 500 },
      );
    }

    // Log access (non-blocking)
    void safeLogAccess({
      action: "admin_update",
      method: "PUT",
      resource: "admin_users",
      result: "success",
      request_id: request.headers.get("x-request-id") || "unknown",
      src_ip:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        undefined,
      user_agent: request.headers.get("user-agent") || undefined,
      meta: {
        adminId,
        updates: validatedData,
      },
    });

    // Emit domain events based on changes (non-blocking)
    if (
      validatedData.business_roles &&
      validatedData.business_roles.length > 0
    ) {
      const newRole = validatedData.business_roles[0];
      if (newRole !== (currentAdmin as any).role) {
        try {
          const event = EventFactory.createAdminRoleAssigned(adminId, "admin");
          await EventService.emit(event);
        } catch (eventError) {
          console.error("Error emitting role assigned event:", eventError);
          // Continue execution, don't fail the request
        }
      }
    }

    if (validatedData.status) {
      if (
        validatedData.status === "suspended" &&
        (currentAdmin as any).status !== "suspended"
      ) {
        try {
          const event = EventFactory.createAdminSuspended(adminId);
          await EventService.emit(event);
        } catch (eventError) {
          console.error("Error emitting admin suspended event:", eventError);
          // Continue execution, don't fail the request
        }
      } else if (
        validatedData.status === "active" &&
        (currentAdmin as any).status !== "active"
      ) {
        try {
          const event = EventFactory.createAdminActivated(adminId);
          await EventService.emit(event);
        } catch (eventError) {
          console.error("Error emitting admin activated event:", eventError);
          // Continue execution, don't fail the request
        }
      }
    }

    // Log event (non-blocking)
    void safeLogEvent({
      action: "admin_updated",
      resource: "admin_users",
      resource_id: adminId,
      actor_id: adminEmail,
      actor_role: "admin",
      result: "success",
      correlation_id: request.headers.get("x-request-id") || "unknown",
      meta: {
        adminId,
        updatedBy: adminEmail,
        changes: validatedData,
        previousState: {
          role: (currentAdmin as any).role,
          status: (currentAdmin as any).status,
        },
        newState: {
          role: (updatedAdmin as any).role,
          status: (updatedAdmin as any).status,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Admin updated successfully",
      admin: {
        id: updatedAdmin.id,
        email: updatedAdmin.email,
        role: updatedAdmin.role,
        business_roles: updatedAdmin.business_roles || [],
        status: updatedAdmin.status,
      },
    });
  } catch (error) {
    console.error("Error in update admin endpoint:", error);

    if (error && typeof error === "object" && "errors" in error) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          error: "Invalid request data",
          details: (error as any).errors,
        },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Core handler functions for admin delete operations
async function getDeletePlanHandler(req: Request, ctx: any) {
  // Enhanced debug logging
  console.log(`[ADMIN_DELETE] GET request to ${req.url}`);
  console.log(`[ADMIN_DELETE] Environment variables:`, {
    DEV_ADMIN_DELETE_ENABLED: process.env.DEV_ADMIN_DELETE_ENABLED,
    NODE_ENV: process.env.NODE_ENV,
    APP_ENV: process.env.APP_ENV,
  });
  console.log(`[ADMIN_DELETE] User context:`, ctx.me);

  // Feature flag (dev-only)
  if (process.env.DEV_ADMIN_DELETE_ENABLED !== "true") {
    console.log(
      `[ADMIN_DELETE] Feature disabled - DEV_ADMIN_DELETE_ENABLED not set to true`,
    );
    return NextResponse.json(
      { ok: false, error: "Feature disabled" },
      { status: 403 },
    );
  }

  // Enhanced logging for production deletions
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV;
  const { id: adminId } = await ctx.params;

  if (appEnv === "production") {
    console.log(
      `[ADMIN_DELETE] PRODUCTION DELETE ATTEMPT - Admin: ${ctx.me?.email}, Target: ${adminId}`,
    );
  }
  if (!adminId) {
    return NextResponse.json(
      { error: "Admin ID is required" },
      { status: 400 },
    );
  }

  // Prevent self-deletion
  if (ctx.me && adminId === ctx.me.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServiceClient();

  // Load the target row first to enforce the "not super_admin" rule
  const { data: target, error: loadErr } = await supabase
    .from("admin_users")
    .select("id, email, role")
    .eq("id", adminId)
    .single();

  if (loadErr || !target) {
    return NextResponse.json(
      { ok: false, error: "Not found" },
      { status: 404 },
    );
  }

  if ((target as any).role === "super_admin") {
    return NextResponse.json(
      { ok: false, error: "Cannot delete super_admin" },
      { status: 403 },
    );
  }

  // Build delete plan
  const plan = await buildDeletePlan(
    supabase,
    (target as any).id,
    (target as any).email,
    (target as any).role,
  );

  // Save plan artifact
  const timestamp = formatTimestampForDir();
  await saveArtifact("plan", plan, timestamp);

  return NextResponse.json({ ok: true, plan });
}

async function executeDeleteHandler(req: Request, ctx: any) {
  // Feature flag (dev-only)
  if (process.env.DEV_ADMIN_DELETE_ENABLED !== "true") {
    return NextResponse.json(
      { ok: false, error: "Feature disabled" },
      { status: 403 },
    );
  }

  // Check environment safety
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV;
  if (appEnv === "production") {
    return NextResponse.json(
      { ok: false, error: "Feature not available in production" },
      { status: 403 },
    );
  }

  // Parse query parameters
  const url = new URL(req.url);
  const includeAudit = url.searchParams.get("include_audit") === "true";

  const { id: adminId } = await ctx.params;
  if (!adminId) {
    return NextResponse.json(
      { error: "Admin ID is required" },
      { status: 400 },
    );
  }

  // Prevent self-deletion
  if (ctx.me && adminId === ctx.me.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 },
    );
  }

  // Log access
  await safeLogAccess({
    action: "admin_delete",
    method: "DELETE",
    resource: "admin_users",
    result: "success",
    request_id: req.headers.get("x-request-id") || "unknown",
    src_ip:
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      undefined,
    user_agent: req.headers.get("user-agent") || undefined,
    meta: {
      adminId,
    },
  });

  const supabase = getSupabaseServiceClient();

  // Load the target row first to enforce the "not super_admin" rule
  const { data: target, error: loadErr } = await supabase
    .from("admin_users")
    .select("id, email, role")
    .eq("id", adminId)
    .single();

  if (loadErr || !target) {
    return NextResponse.json(
      { ok: false, error: "Not found" },
      { status: 404 },
    );
  }

  if ((target as any).role === "super_admin") {
    return NextResponse.json(
      { ok: false, error: "Cannot delete super_admin" },
      { status: 403 },
    );
  }

  // Build delete plan
  const plan = await buildDeletePlan(
    supabase,
    (target as any).id,
    (target as any).email,
    (target as any).role,
  );

  // Execute delete plan
  const summary = await executeDeletePlan(supabase, plan, includeAudit);

  // Save summary artifact
  const timestamp = formatTimestampForDir();
  await saveArtifact("summary", summary, timestamp);

  if (!summary.success) {
    return NextResponse.json(
      {
        ok: false,
        error: summary.error || "Delete operation failed",
        at: summary.at,
      },
      { status: 500 },
    );
  }

  // Log event
  await safeLogEvent({
    action: "admin_deleted",
    resource: "admin_users",
    resource_id: adminId,
    actor_id: ctx.me.email,
    actor_role: "admin",
    result: "success",
    correlation_id: req.headers.get("x-request-id") || "unknown",
    meta: {
      adminId,
      deletedBy: ctx.me.email,
      targetEmail: (target as any).email,
      targetRole: (target as any).role,
      summary: summary,
    },
  });

  return NextResponse.json({ ok: true, summary });
}

// Compose the handlers with proper wrapper chain
const guardedGet = withRequestContext(
  withAuditLogging(
    "admin.delete.GET",
    withSuperAdminApiGuard(getDeletePlanHandler),
  ),
);

const guardedDelete = withRequestContext(
  withAuditLogging(
    "admin.delete.DELETE",
    withSuperAdminApiGuard(executeDeleteHandler),
  ),
);

// Export the wrapped handlers with error handling
export const GET = (req: Request, ctx: any) =>
  guardedGet(req, ctx).catch((e: any) =>
    NextResponse.json(
      {
        ok: false,
        error: String(e?.message || e),
      },
      { status: 500 },
    ),
  );

export const DELETE = (req: Request, ctx: any) =>
  guardedDelete(req, ctx).catch((e: any) =>
    NextResponse.json(
      {
        ok: false,
        error: String(e?.message || e),
      },
      { status: 500 },
    ),
  );
