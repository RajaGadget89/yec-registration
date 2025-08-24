import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin, cookieOptions, getAppUrl } from "../../../lib/auth-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    console.log("[api/callback] POST request received");
    console.log("[api/callback] request URL:", request.url);
    console.log(
      "[api/callback] request headers:",
      Object.fromEntries(request.headers.entries()),
    );

    const body = await request.json();
    const { access_token, refresh_token, next } = body;

    console.log("[api/callback] request body parsed:", {
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
      next: next,
      accessTokenLength: access_token?.length || 0,
      refreshTokenLength: refresh_token?.length || 0,
    });

    if (!access_token || !refresh_token) {
      console.error("[api/callback] missing tokens in POST body");
      return NextResponse.json(
        { message: "Missing authentication tokens" },
        { status: 400 },
      );
    }

    console.log("[api/callback] verifying tokens with Supabase");
    console.log(
      "[api/callback] Supabase URL:",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
    console.log(
      "[api/callback] Service role key exists:",
      !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    // Verify tokens with Supabase Admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Verify the access token and get user info
    console.log("[api/callback] calling supabase.auth.getUser...");
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(access_token);

    console.log("[api/callback] Supabase response:", {
      hasUser: !!user,
      userEmail: user?.email,
      error: error?.message || null,
      errorCode: error?.status || null,
    });

    if (error || !user) {
      console.error("[api/callback] token verification failed:", error);
      return NextResponse.json(
        { message: "Invalid authentication tokens" },
        { status: 401 },
      );
    }

    console.log("[api/callback] user verified:", user.email);

    // Check if user is admin
    console.log("[api/callback] checking admin status for:", user.email);
    console.log(
      "[api/callback] admin emails from env:",
      process.env.ADMIN_EMAILS,
    );

    const isUserAdmin = isAdmin(user.email || "");
    console.log("[api/callback] is user admin?", isUserAdmin);

    if (!user.email || !isUserAdmin) {
      console.error("[api/callback] user not in admin allowlist:", user.email);
      return NextResponse.json(
        { message: "Access denied. Admin privileges required." },
        { status: 403 },
      );
    }

    console.log("[api/callback] admin access confirmed, setting cookies");

    // Create redirect response using consistent app URL
    const redirectUrl = next || "/admin";
    const baseUrl = getAppUrl();
    const fullRedirectUrl = new URL(redirectUrl, baseUrl);

    console.log("[api/callback] redirect URL construction:", {
      redirectUrl,
      baseUrl,
      fullRedirectUrl: fullRedirectUrl.toString(),
    });

    const response = NextResponse.redirect(fullRedirectUrl, 303);

    // Set the three required cookies
    const options = cookieOptions();

    // Mask tokens for logging (first/last 4 chars)
    const maskToken = (token: string) =>
      token
        ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}`
        : "null";

    console.log("[api/callback] cookie options:", options);
    console.log("[api/callback] setting cookies:", {
      "sb-access-token": maskToken(access_token),
      "sb-refresh-token": maskToken(refresh_token),
      "admin-email": user.email,
    });

    // Set cookies with detailed logging
    response.cookies.set("sb-access-token", access_token, options);
    response.cookies.set("sb-refresh-token", refresh_token, options);
    response.cookies.set("admin-email", user.email, options);

    // Log the actual response headers
    console.log("[api/callback] final response headers:", {
      location: response.headers.get("location"),
      status: response.status,
      statusText: response.statusText,
    });

    return response;
  } catch (error) {
    console.error("[api/callback] unexpected error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
