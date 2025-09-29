import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isCheckinSystemEnabled } from "@/lib/features";
// import { hasBusinessRole } from "@/lib/rbac"; // not used here
import { safeLogAccess } from "@/lib/audit/safeAudit";

export const dynamic = "force-dynamic";

/**
 * POST /api/checker/callback
 * Complete checker admin authentication
 */
export async function POST(req: NextRequest) {
  // Create a response object for cookie handling
  const res = new NextResponse();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key: string) => req.cookies.get(key)?.value,
        set: (key, value, options) => {
          // Forward any cookie mutations to the response
          res.cookies.set({ name: key, value, ...options });
        },
        remove: (key, options) => {
          res.cookies.set({
            name: key,
            value: "",
            ...options,
            expires: new Date(0),
          });
        },
      },
    },
  );

  // Check feature flag
  if (!isCheckinSystemEnabled()) {
    return NextResponse.json(
      { error: "Feature not available" },
      { status: 404 },
    );
  }

  try {
    const body = await req.json();
    const { access_token, refresh_token } = body;

    console.log("[api/checker/callback] request body parsed:", {
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
      accessTokenLength: access_token?.length || 0,
      refreshTokenLength: refresh_token?.length || 0,
    });

    if (!access_token || !refresh_token) {
      console.error("[api/checker/callback] missing tokens in POST body");
      return NextResponse.json(
        { error: "Missing authentication tokens" },
        { status: 400 },
      );
    }

    // Set the session (same as traditional admin system)
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      console.error(
        "[api/checker/callback] session establishment error:",
        error,
      );
      return NextResponse.json(
        { error: "Session establishment failed" },
        { status: 500 },
      );
    }

    if (!data.session) {
      console.error("[api/checker/callback] no session established");
      return NextResponse.json(
        { error: "No session established" },
        { status: 500 },
      );
    }

    const user = data.session.user;
    console.log(
      "[api/checker/callback] session established for user:",
      user.email,
    );

    // Set checker-email cookie and let middleware handle authentication (same as traditional admin system)
    // The middleware will check the database and validate the checker_admin role

    // Set checker-email cookie for checker guard (same as traditional admin system)
    res.cookies.set("checker-email", user.email || "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    console.log(
      "[api/checker/callback] checker-email cookie set for:",
      user.email,
    );

    void safeLogAccess({
      action: "checker_callback_access",
      method: "POST",
      resource: "api/checker/callback",
      result: "success",
      request_id: req.headers.get("x-request-id") || "unknown",
      src_ip:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        undefined,
      user_agent: req.headers.get("user-agent") || undefined,
      meta: { userId: user.id, userEmail: user.email },
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          email: user.email,
        },
      },
      { status: 200, headers: res.headers },
    );
  } catch (error) {
    console.error("Error in /api/checker/callback:", error);
    void safeLogAccess({
      action: "checker_callback_access",
      method: "POST",
      resource: "api/checker/callback",
      result: "error",
      request_id: req.headers.get("x-request-id") || "unknown",
      src_ip:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        undefined,
      user_agent: req.headers.get("user-agent") || undefined,
      meta: { error: (error as Error).message },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
