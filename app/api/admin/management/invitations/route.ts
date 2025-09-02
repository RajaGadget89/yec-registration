import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserFromRequest,
  hasRoleFromRequest,
} from "../../../../lib/auth-utils.server";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { withAuditLogging } from "../../../../lib/audit/withAuditAccess";
import { isFeatureEnabled } from "../../../../lib/features";

async function listInvitations(request: NextRequest): Promise<NextResponse> {
  // Feature flag (mirror invite route)
  if (!isFeatureEnabled("adminManagement")) {
    return NextResponse.json(
      { error: "Feature not available" },
      { status: 404 },
    );
  }

  // AuthN/AuthZ (super_admin only)
  const currentUser = await getCurrentUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const isSuperAdmin = await hasRoleFromRequest(request, "super_admin");
  if (!isSuperAdmin) {
    return NextResponse.json(
      { error: "Insufficient permissions. Super admin access required." },
      { status: 403 },
    );
  }

  // Query params
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") ?? "20", 10),
    100,
  );
  const offset = Math.max(
    parseInt(url.searchParams.get("offset") ?? "0", 10),
    0,
  );

  // Read-only select from admin_invitations
  const supabase = getSupabaseServiceClient();
  let query = supabase
    .from("admin_invitations")
    .select("*", { count: "exact" });
  if (status && ["pending", "accepted"].includes(status)) {
    query = query.eq("status", status);
  }
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[INVITATIONS_LIST] fetch error", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    invitations: data ?? [],
    pagination: { limit, offset, total: count ?? 0 },
  });
}

export const GET = withAuditLogging(listInvitations);
