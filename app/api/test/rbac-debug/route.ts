import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "../../../lib/auth-utils.server";
import { getRolesForEmail } from "../../../lib/rbac";

/**
 * GET /api/test/rbac-debug
 * Debug endpoint for E2E tests to verify authentication and RBAC
 *
 * Query params: email (optional) - email to check roles for
 *
 * Returns: { roles: string[], isAdmin: boolean, email: string }
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const emailParam = url.searchParams.get("email");

    // If email parameter is provided, check roles for that email
    if (emailParam) {
      const roles = getRolesForEmail(emailParam);
      return NextResponse.json({
        roles: Array.from(roles),
        isAdmin: roles.size > 0,
        email: emailParam,
      });
    }

    // Otherwise, check current authenticated user
    const currentUser = await getCurrentUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const roles = getRolesForEmail(currentUser.email);
    return NextResponse.json({
      roles: Array.from(roles),
      isAdmin: roles.size > 0,
      email: currentUser.email,
      user: {
        id: currentUser.id,
        role: currentUser.role,
        is_active: currentUser.is_active,
      },
    });
  } catch (error) {
    console.error("RBAC debug error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
