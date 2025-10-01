import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserFromRequest,
  hasRoleFromRequest,
} from "../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { withAuditLogging } from "../../../../lib/audit/withAuditAccess";
import {
  isAdminJobAssignmentEnabled,
  isFeatureEnabled,
  FEATURES,
} from "../../../../lib/features";

// Note: Super admin authorization is handled by RBAC system and hasRoleFromRequest()

/**
 * GET /api/admin/management/admins
 * List all admin users with pagination and filtering
 *
 * Auth: super_admin only
 * Query params: q (search), status, role, page, pageSize, sortBy, sortOrder
 */
async function listAdmins(request: NextRequest): Promise<NextResponse> {
  try {
    // Check feature flag
    if (!isFeatureEnabled(FEATURES.ADMIN_MANAGEMENT)) {
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

    // Super admin authorization is handled by RBAC system above

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

    // Parse and validate sorting parameters
    const sortByParam = url.searchParams.get("sortBy") || "created_at";
    const sortOrderParam = url.searchParams.get("sortOrder") || "desc";

    const allowedSortFields = ["created_at", "email", "role", "last_login_at"];
    const isSortByAllowed = allowedSortFields.includes(sortByParam);
    const isOrderAllowed = ["asc", "desc"].includes(
      sortOrderParam.toLowerCase(),
    );

    if (!isSortByAllowed || !isOrderAllowed) {
      return NextResponse.json(
        { error: "Invalid sort parameters", code: "validation_error" },
        { status: 422 },
      );
    }

    const ascending = sortOrderParam.toLowerCase() === "asc";

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

    if (status === "active") {
      query = query.eq("status", "active");
    } else if (status === "suspended") {
      query = query.eq("status", "suspended");
    }

    if (role && ["admin", "super_admin", "checker_admin"].includes(role)) {
      query = query.eq("role", role);
    }

    // Apply pagination and sorting
    const offset = (page - 1) * pageSize;
    query = query
      .order(sortByParam, { ascending })
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
        id: (admin as any).id,
        email: (admin as any).email,
        role: (admin as any).role,
        ...(isAdminJobAssignmentEnabled() && {
          business_roles: (admin as any).business_roles || [],
        }),
        status: (admin as any).status,
        created_at: (admin as any).created_at,
        updated_at: (admin as any).updated_at,
        last_login_at: (admin as any).last_login_at,
        is_active: (admin as any).is_active,
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
