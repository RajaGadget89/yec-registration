import { NextRequest, NextResponse } from "next/server";
import { PricingManagementService } from "../../../../server/pricing-management/pricing.service";
import {
  getCurrentUserFromRequest,
  hasRoleFromRequest,
} from "../../../../lib/auth-utils.server";

/**
 * GET /api/admin/pricing/stats
 * Get pricing statistics for admin dashboard
 *
 * Auth: Super admin only
 */
export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated and is super_admin
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has super_admin role
    if (!(await hasRoleFromRequest(req, "super_admin"))) {
      return NextResponse.json(
        { error: "Insufficient permissions. Super admin access required." },
        { status: 403 },
      );
    }

    const stats = await PricingManagementService.getPricingStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error("[ADMIN_PRICING_STATS] Error:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: error.message,
          code: "STATS_FETCH_ERROR",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
