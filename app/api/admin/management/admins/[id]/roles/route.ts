import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserFromRequest,
  hasRoleFromRequest,
} from "../../../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../../../lib/supabase-server";
import { withAuditLogging } from "../../../../../../lib/audit/withAuditAccess";
import { isFeatureEnabled } from "../../../../../../lib/features";
import { BusinessRole } from "../../../../../../types/database";

// Super admin allowlist as specified in requirements
const SUPER_ADMIN_ALLOWLIST = ["raja.gadgets89@gmail.com"];

// Valid business roles
const VALID_BUSINESS_ROLES: BusinessRole[] = [
  "user_profile",
  "payment_slip",
  "tcc_card",
];

/**
 * PATCH /api/admin/management/admins/[id]/roles
 * Update admin user roles and business roles
 *
 * Auth: super_admin only
 * Body: { role?: "admin" | "super_admin", business_roles?: BusinessRole[] }
 */
async function updateAdminRoles(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    // Check feature flag
    if (!isFeatureEnabled("adminManagement")) {
      return NextResponse.json(
        { error: "Feature not available" },
        { status: 404 },
      );
    }

    // Check if user is authenticated and is super_admin
    const currentUser = await getCurrentUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has super_admin role
    if (!(await hasRoleFromRequest(request, "super_admin"))) {
      return NextResponse.json(
        { error: "Insufficient permissions. Super admin access required." },
        { status: 403 },
      );
    }

    // Check if user is in super admin allowlist
    if (!SUPER_ADMIN_ALLOWLIST.includes(currentUser.email.toLowerCase())) {
      return NextResponse.json(
        { error: "Access denied. Not in super admin allowlist." },
        { status: 403 },
      );
    }

    const adminId = params.id;
    if (!adminId) {
      return NextResponse.json(
        { error: "Admin ID is required" },
        { status: 400 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { role, business_roles } = body;

    // Validate role if provided
    if (role && !["admin", "super_admin"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'admin' or 'super_admin'" },
        { status: 400 },
      );
    }

    // Validate business_roles if provided
    if (business_roles !== undefined) {
      if (!Array.isArray(business_roles)) {
        return NextResponse.json(
          { error: "business_roles must be an array" },
          { status: 400 },
        );
      }

      // Check if all business roles are valid
      const invalidRoles = business_roles.filter(
        (r: string) => !VALID_BUSINESS_ROLES.includes(r as BusinessRole),
      );
      if (invalidRoles.length > 0) {
        return NextResponse.json(
          {
            error: `Invalid business roles: ${invalidRoles.join(", ")}. Valid roles are: ${VALID_BUSINESS_ROLES.join(", ")}`,
          },
          { status: 400 },
        );
      }
    }

    const supabase = getSupabaseServiceClient();

    // Get current admin user
    const { data: admin, error: fetchError } = await supabase
      .from("admin_users")
      .select("*")
      .eq("id", adminId)
      .single();

    if (fetchError || !admin) {
      return NextResponse.json(
        { error: "Admin user not found" },
        { status: 404 },
      );
    }

    // Check if trying to update self
    if ((admin as any).email === currentUser.email) {
      return NextResponse.json(
        { error: "Cannot update your own account" },
        { status: 400 },
      );
    }

    // Check if trying to demote the last super_admin
    if (
      role === "admin" ||
      (role === undefined && business_roles !== undefined)
    ) {
      const { data: superAdmins, error: countError } = await supabase
        .from("admin_users")
        .select("id")
        .eq("role", "super_admin")
        .eq("is_active", true);

      if (countError) {
        return NextResponse.json(
          { error: "Failed to check super admin count" },
          { status: 500 },
        );
      }

      if (superAdmins.length === 1 && (superAdmins[0] as any).id === adminId) {
        return NextResponse.json(
          { error: "Cannot demote the last super admin" },
          { status: 400 },
        );
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (role !== undefined) {
      updateData.role = role;
    }

    if (business_roles !== undefined) {
      updateData.business_roles = business_roles;
    }

    // If no updates provided, return error
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 },
      );
    }

    // Update admin user
    const { error: updateError } = await (supabase as any)
      .from("admin_users")
      .update(updateData as any)
      .eq("id", adminId);

    if (updateError) {
      console.error("Error updating admin user:", updateError);
      return NextResponse.json(
        { error: "Failed to update admin user" },
        { status: 500 },
      );
    }

    // Get updated admin user
    const { data: updatedAdmin, error: fetchUpdatedError } = await supabase
      .from("admin_users")
      .select("*")
      .eq("id", adminId)
      .single();

    if (fetchUpdatedError || !updatedAdmin) {
      return NextResponse.json(
        { error: "Failed to fetch updated admin user" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: (updatedAdmin as any).id,
        email: (updatedAdmin as any).email,
        role: (updatedAdmin as any).role,
        business_roles: (updatedAdmin as any).business_roles || [],
        status: (updatedAdmin as any).is_active ? "active" : "suspended",
        created_at: (updatedAdmin as any).created_at,
        updated_at: (updatedAdmin as any).updated_at,
        last_login_at: (updatedAdmin as any).last_login_at,
        is_active: (updatedAdmin as any).is_active,
      },
    });
  } catch (error) {
    console.error("Update admin roles error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const PATCH = withAuditLogging(updateAdminRoles);
