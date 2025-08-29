import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserFromRequest,
  hasRoleFromRequest,
} from "../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { withAuditLogging } from "../../../../lib/audit/withAuditAccess";
import { isFeatureEnabled } from "../../../../lib/features";

// Super admin allowlist as specified in requirements
const SUPER_ADMIN_ALLOWLIST = ["raja.gadgets89@gmail.com"];

/**
 * GET /api/admin/management/admins
 * List all admin users with pagination and filtering
 *
 * Auth: super_admin only
 * Query params: q (search), status, role, page, pageSize
 */
async function listAdmins(request: NextRequest): Promise<NextResponse> {
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

    // Parse query parameters
    const url = new URL(request.url);
    const search = url.searchParams.get("q") || "";
    const status = url.searchParams.get("status");
    const role = url.searchParams.get("role");
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(url.searchParams.get("pageSize") || "20"),
      100,
    );

    // Validate pagination parameters
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();

    // Build query
    let query = supabase.from("admin_users").select("*", { count: "exact" });

    // Apply filters
    if (search) {
      query = query.ilike("email", `%${search}%`);
    }

    if (status && ["active", "suspended"].includes(status)) {
      query = query.eq("status", status);
    }

    if (role && ["admin", "super_admin"].includes(role)) {
      query = query.eq("role", role);
    }

    // Apply pagination
    const offset = (page - 1) * pageSize;
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Execute query
    const { data: admins, error, count } = await query;

    if (error) {
      console.error("Error fetching admin users:", error);
      return NextResponse.json(
        { error: "Failed to fetch admin users" },
        { status: 500 },
      );
    }

    // Calculate pagination info
    const totalPages = count ? Math.ceil(count / pageSize) : 0;
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      admins: admins.map((admin) => ({
        id: admin.id,
        email: admin.email,
        role: admin.role,
        status: admin.status,
        created_at: admin.created_at,
        updated_at: admin.updated_at,
        last_login_at: admin.last_login_at,
        is_active: admin.is_active,
      })),
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      filters: {
        search,
        status,
        role,
      },
    });
  } catch (error) {
    console.error("List admins error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const GET = withAuditLogging(listAdmins);
