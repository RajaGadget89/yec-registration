import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasBusinessRole } from "../../lib/rbac";
import { getAppUrl, getCookieOptions } from "../../lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token_hash = searchParams.get("token_hash");
    const token = searchParams.get("token"); // Support both token and token_hash
    const type = searchParams.get("type");
    const next = searchParams.get("next");

    console.log("[checker/verify] GET request received", {
      hasTokenHash: !!token_hash,
      hasToken: !!token,
      type: type,
      next: next,
      url: request.url,
    });

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

    let sessionData;

    // Use token_hash if available, otherwise use token (for server-side magic links)
    const authToken = token_hash || token;

    if (authToken && type) {
      // Server-side OTP flow
      console.log("[checker/verify] using server-side OTP flow", {
        tokenType: token_hash ? "token_hash" : "token",
        type: type,
      });
      const { data, error } = await supabase.auth.verifyOtp({
        type: type as any,
        token_hash: authToken, // Both token and token_hash work with verifyOtp
      });

      if (error) {
        console.error("[checker/verify] OTP verification failed:", error);
        return NextResponse.redirect(
          new URL(
            `/checker/login?error=verify_failed&message=${encodeURIComponent(error.message)}`,
            getAppUrl(),
          ),
          303,
        );
      }

      sessionData = data;
    } else {
      // No token provided, redirect to login
      console.log("[checker/verify] no token provided, redirecting to login");
      return NextResponse.redirect(
        new URL("/checker/login?error=no_token", getAppUrl()),
        303,
      );
    }

    if (!sessionData?.session) {
      console.error("[checker/verify] no session established");
      return NextResponse.redirect(
        new URL("/checker/login?error=no_session", getAppUrl()),
        303,
      );
    }

    console.log(
      "[checker/verify] session established for user:",
      sessionData.session.user.email,
    );

    // Verify the user has checker_admin business role
    const userEmail = sessionData.session.user.email;
    if (!userEmail || !(await hasBusinessRole(userEmail, 'checker_admin'))) {
      console.error("[checker/verify] user not a checker admin:", userEmail);
      return NextResponse.redirect(
        new URL("/checker/login?error=not_checker_admin", getAppUrl()),
        303,
      );
    }

    console.log("[checker/verify] checker admin access confirmed");

    // Set checker-email cookie for checker guard
    response.cookies.set("checker-email", userEmail, cookieOpts);
    console.log("[checker/verify] checker-email cookie set for:", userEmail);

    // Create redirect response
    const redirectUrl = next || "/checker/scan";
    const baseUrl = getAppUrl();
    const fullRedirectUrl = new URL(redirectUrl, baseUrl);

    console.log("[checker/verify] redirect URL construction:", {
      redirectUrl,
      baseUrl,
      fullRedirectUrl: fullRedirectUrl.toString(),
    });

    console.log(
      "[checker/verify] authentication successful, redirecting to:",
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
    console.error("[checker/verify] unexpected error:", error);
    return NextResponse.redirect(
      new URL("/checker/login?error=unexpected_error", getAppUrl()),
      303,
    );
  }
}
