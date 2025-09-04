import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "../../../lib/auth-utils.server";
import { guardTestEndpoint } from "@/app/lib/test-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const guard = guardTestEndpoint(request);
  if (!guard.allowed) {
    return new Response(guard.message, { status: guard.status });
  }

  console.log("[ROUTE_AUTH_CHECK] Endpoint called");

  try {
    // Test the fixed getCurrentUserFromRequest function
    const user = await getCurrentUserFromRequest(request);
    console.log("[ROUTE_AUTH_CHECK] User from request:", user);

    // Get all request headers for debugging
    const headers = Object.fromEntries(request.headers.entries());
    console.log("[ROUTE_AUTH_CHECK] Request headers:", headers);

    // Check for specific cookies
    const cookieHeader = request.headers.get("cookie");
    const cookies = cookieHeader ? Object.fromEntries(
      cookieHeader.split(";").map((cookie) => {
        const [name, value] = cookie.trim().split("=");
        return [name, value];
      })
    ) : {};

    // Check for Supabase session cookies
    const supabaseCookies = {
      accessToken: cookies["sb-access-token"],
      refreshToken: cookies["sb-refresh-token"],
      adminEmail: cookies["admin-email"],
    };

    if (!user) {
      return NextResponse.json({ 
        ok: false, 
        email: null, 
        err: "Not authenticated",
        cookies: supabaseCookies,
        headers: Object.keys(headers)
      }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      email: user.email,
      role: user.role,
      isActive: user.is_active,
      cookies: supabaseCookies,
      headers: Object.keys(headers)
    });
  } catch (error) {
    console.error("[ROUTE_AUTH_CHECK] Error:", error);
    return NextResponse.json({ 
      ok: false, 
      email: null, 
      err: String(error),
      cookies: {},
      headers: []
    }, { status: 500 });
  }
}
