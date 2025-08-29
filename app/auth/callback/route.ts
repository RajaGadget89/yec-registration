import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAdmin } from "../../lib/auth-utils";
import { getAppUrl, getCookieOptions } from "../../lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next");

    console.log("[auth/callback] GET request received", {
      hasCode: !!code,
      next: next,
      url: request.url,
    });

    if (!code) {
      console.error("[auth/callback] missing code parameter");
      return NextResponse.redirect(
        new URL("/admin/login?error=missing_code", getAppUrl()),
        303
      );
    }

    // Create response object for cookie handling
    const response = NextResponse.next();

    // Get cookie options for consistent settings
    const cookieOpts = getCookieOptions();

    // Create Supabase server client with cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (key: string) => request.cookies.get(key)?.value,
          set: (key, value, options) => {
            // Forward cookie mutations to the response with consistent options
            response.cookies.set({
              name: key,
              value,
              ...cookieOpts,
              ...options,
            });
          },
          remove: (key, options) => {
            response.cookies.set({
              name: key,
              value: "",
              ...cookieOpts,
              ...options,
              expires: new Date(0),
            });
          },
        },
      },
    );

    // Exchange code for session using Supabase's SSR function
    console.log("[auth/callback] exchanging code for session");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] exchange failed:", error);
      return NextResponse.redirect(
        new URL(`/admin/login?error=exchange_failed&message=${encodeURIComponent(error.message)}`, getAppUrl()),
        303
      );
    }

    if (!data.session) {
      console.error("[auth/callback] no session established");
      return NextResponse.redirect(
        new URL("/admin/login?error=no_session", getAppUrl()),
        303
      );
    }

    console.log("[auth/callback] session established for user:", data.session.user.email);

    // Verify the user is an admin
    const userEmail = data.session.user.email;
    if (!userEmail || !isAdmin(userEmail)) {
      console.error("[auth/callback] user not in admin allowlist:", userEmail);
      return NextResponse.redirect(
        new URL("/admin/login?error=not_admin", getAppUrl()),
        303
      );
    }

    console.log("[auth/callback] admin access confirmed");

    // Set admin-email cookie for admin guard
    response.cookies.set("admin-email", userEmail, cookieOpts);
    console.log("[auth/callback] admin-email cookie set for:", userEmail);

    // Create redirect response
    const redirectUrl = next || "/admin/management";
    const baseUrl = getAppUrl();
    const fullRedirectUrl = new URL(redirectUrl, baseUrl);

    console.log("[auth/callback] redirect URL construction:", {
      redirectUrl,
      baseUrl,
      fullRedirectUrl: fullRedirectUrl.toString(),
    });

    console.log("[auth/callback] authentication successful, redirecting to:", fullRedirectUrl.toString());

    // Create a new redirect response with the cookies from our response
    const redirectResponse = NextResponse.redirect(fullRedirectUrl, 303);

    // Copy cookies from our response to the redirect response
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });

    return redirectResponse;
  } catch (error) {
    console.error("[auth/callback] unexpected error:", error);
    return NextResponse.redirect(
      new URL("/admin/login?error=unexpected_error", getAppUrl()),
      303
    );
  }
}
