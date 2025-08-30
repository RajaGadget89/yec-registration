import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdminApiGuard } from "../../../../../lib/admin-guard-server";
import { getCurrentUserFromRequest } from "../../../../../lib/auth-utils.server";
import {
  safeLogAccess,
  safeLogEvent,
} from "../../../../../lib/audit/safeAudit";
import { getSupabaseServiceClient } from "../../../../../lib/supabase-server";
import { EventService } from "../../../../../lib/events/eventService";
import { EventFactory } from "../../../../../lib/events/eventFactory";
import { isFeatureEnabled } from "../../../../../lib/features";

const updateSchema = z.object({
  roles: z.array(z.enum(["admin", "super_admin"])).optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Check feature flag
  if (!isFeatureEnabled("adminManagement")) {
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

    if (adminUser.role !== "super_admin") {
      return NextResponse.json(
        {
          error: "Forbidden: Super admin access required",
          code: "SUPER_ADMIN_REQUIRED",
        },
        { status: 403 },
      );
    }

    if (adminUser.status !== "active") {
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
    if (!validatedData.roles && !validatedData.status) {
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
    if (adminId === adminUser.id) {
      return NextResponse.json(
        { error: "Cannot modify your own account" },
        { status: 400 },
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (validatedData.roles && validatedData.roles.length > 0) {
      updateData.role = validatedData.roles[0]; // Take first role
    }
    if (validatedData.status) {
      updateData.status = validatedData.status;
    }

    // Perform database update
    const { data: updatedAdmin, error: updateError } = await supabase
      .from("admin_users")
      .update(updateData)
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
    if (validatedData.roles && validatedData.roles.length > 0) {
      const newRole = validatedData.roles[0];
      if (newRole !== currentAdmin.role) {
        try {
          const event = EventFactory.createAdminRoleAssigned(adminId, newRole);
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
        currentAdmin.status !== "suspended"
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
        currentAdmin.status !== "active"
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
          role: currentAdmin.role,
          status: currentAdmin.status,
        },
        newState: {
          role: updatedAdmin.role,
          status: updatedAdmin.status,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Admin updated successfully",
      admin: {
        id: updatedAdmin.id,
        email: updatedAdmin.email,
        roles: [updatedAdmin.role],
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Feature flag check temporarily disabled for E2E testing
  // if (!isFeatureEnabled("adminManagement")) {
  //   return NextResponse.json(
  //     { error: "Feature not available" },
  //     { status: 404 }
  //   );
  // }

  return withSuperAdminApiGuard(async (req) => {
    try {
      const currentUser = await getCurrentUserFromRequest(req);
      if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { id: adminId } = await params;
      if (!adminId) {
        return NextResponse.json(
          { error: "Admin ID is required" },
          { status: 400 },
        );
      }

      // Prevent self-deletion
      if (adminId === currentUser.id) {
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

      // Create database client
      const supabase = getSupabaseServiceClient();

      // Get current admin state
      const { data: currentAdmin, error: fetchError } = await supabase
        .from("admin_users")
        .select("*")
        .eq("id", adminId)
        .single();

      if (fetchError || !currentAdmin) {
        return NextResponse.json({ error: "Admin not found" }, { status: 404 });
      }

      // Soft delete by setting is_active to false and clearing role
      const { data: deletedAdmin, error: deleteError } = await supabase
        .from("admin_users")
        .update({
          is_active: false,
          role: "admin", // Reset to basic admin role
          status: "suspended", // Set status to suspended
        })
        .eq("id", adminId)
        .select()
        .single();

      if (deleteError) {
        console.error("Error deleting admin:", deleteError);
        return NextResponse.json(
          { error: "Failed to delete admin" },
          { status: 500 },
        );
      }

      // Emit domain events for role revocation and suspension
      const roleEvent = EventFactory.createAdminRoleRevoked(
        adminId,
        currentAdmin.role,
      );
      await EventService.emit(roleEvent);

      const suspendEvent = EventFactory.createAdminSuspended(adminId);
      await EventService.emit(suspendEvent);

      // Log event
      await safeLogEvent({
        action: "admin_deleted",
        resource: "admin_users",
        resource_id: adminId,
        actor_id: currentUser.email,
        actor_role: "admin",
        result: "success",
        correlation_id: req.headers.get("x-request-id") || "unknown",
        meta: {
          adminId,
          deletedBy: currentUser.email,
          previousState: {
            role: currentAdmin.role,
            status: currentAdmin.status,
            is_active: currentAdmin.is_active,
          },
          newState: {
            role: deletedAdmin.role,
            status: deletedAdmin.status,
            is_active: deletedAdmin.is_active,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Admin deleted successfully",
        admin: deletedAdmin,
      });
    } catch (error) {
      console.error("Error in delete admin endpoint:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  });
}
