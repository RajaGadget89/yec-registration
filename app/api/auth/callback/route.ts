import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAdmin, getAppUrl } from "../../../lib/auth-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    console.log("[api/callback] POST request received");
    console.log("[api/callback] request URL:", request.url);

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

    // Create response object for cookie handling
    const response = NextResponse.next();

    // Create Supabase server client with cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (key: string) => request.cookies.get(key)?.value,
          set: (key, value, options) => {
            // Forward cookie mutations to the response
            response.cookies.set({ name: key, value, ...options });
          },
          remove: (key, options) => {
            response.cookies.set({
              name: key,
              value: "",
              ...options,
              expires: new Date(0),
            });
          },
        },
      },
    );

    // Set the session using Supabase's session management
    console.log("[api/callback] setting Supabase session");
    const { data: sessionData, error: sessionError } =
      await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

    if (sessionError) {
      console.error(
        "[api/callback] session establishment failed:",
        sessionError,
      );
      return NextResponse.json(
        { message: "Failed to establish session" },
        { status: 401 },
      );
    }

    if (!sessionData.session) {
      console.error("[api/callback] no session established");
      return NextResponse.json(
        { message: "Session establishment failed" },
        { status: 401 },
      );
    }

    console.log(
      "[api/callback] session established for user:",
      sessionData.session.user.email,
    );

    // Verify the user is an admin
    const userEmail = sessionData.session.user.email;
    if (!userEmail || !isAdmin(userEmail)) {
      console.error("[api/callback] user not in admin allowlist:", userEmail);
      return NextResponse.json(
        { message: "Access denied. Admin privileges required." },
        { status: 403 },
      );
    }

    console.log("[api/callback] admin access confirmed");

    // Create redirect response
    const redirectUrl = next || "/admin";
    const baseUrl = getAppUrl();
    const fullRedirectUrl = new URL(redirectUrl, baseUrl);

    console.log("[api/callback] redirect URL construction:", {
      redirectUrl,
      baseUrl,
      fullRedirectUrl: fullRedirectUrl.toString(),
    });

    console.log(
      "[api/callback] authentication successful, redirecting to:",
      fullRedirectUrl.toString(),
    );

    // Create a new redirect response with the cookies from our response
    const redirectResponse = NextResponse.redirect(fullRedirectUrl, 303);

    // Copy cookies from our response to the redirect response
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });

    return redirectResponse;
  } catch (error) {
    console.error("[api/callback] unexpected error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
