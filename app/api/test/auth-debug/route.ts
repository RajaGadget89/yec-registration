import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "../../../lib/auth-utils.server";
import { isAdmin } from "../../../lib/admin-guard";
import { getRolesForEmail } from "../../../lib/rbac";

export async function GET(request: NextRequest) {
  try {
    // Get user from request
    const user = await getCurrentUserFromRequest(request);

    // Get cookies for debugging
    const cookies = request.cookies;
    const adminEmail = cookies.get("admin-email")?.value;
    const devEmail = cookies.get("dev-user-email")?.value;

    return NextResponse.json({
      user,
      isAdmin: user ? isAdmin(user.email) : false,
      roles: user ? Array.from(getRolesForEmail(user.email)) : [],
      cookies: {
        adminEmail,
        devEmail,
        allCookies: Object.fromEntries(
          Array.from(cookies.getAll().map((c) => [c.name, c.value])),
        ),
      },
      headers: {
        cookie: request.headers.get("cookie"),
        authorization: request.headers.get("authorization"),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
