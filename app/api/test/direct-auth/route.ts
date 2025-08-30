import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAdmin } from "../../../lib/auth-utils";
import { getAppUrl, getCookieOptions } from "../../../lib/env";
import { isE2E } from "../../../lib/env/isE2E";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Only allow in E2E test mode
  if (!isE2E()) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Verify the user is an admin
    if (!isAdmin(email)) {
      return NextResponse.json(
        { message: "Access denied. Admin privileges required." },
        { status: 403 }
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

    // For testing purposes, we'll create a mock session
    // In a real scenario, this would come from Supabase verification
    console.log("[test/direct-auth] Setting up test session for:", email);

    // Set admin-email cookie for admin guard
    response.cookies.set("admin-email", email, cookieOpts);
    console.log("[test/direct-auth] admin-email cookie set for:", email);

    // Create redirect response
    const redirectUrl = "/admin/management";
    const baseUrl = getAppUrl();
    const fullRedirectUrl = new URL(redirectUrl, baseUrl);

    console.log("[test/direct-auth] redirect URL construction:", {
      redirectUrl,
      baseUrl,
      fullRedirectUrl: fullRedirectUrl.toString(),
    });

    console.log("[test/direct-auth] test authentication successful, redirecting to:", fullRedirectUrl.toString());

    // Create a new redirect response with the cookies from our response
    const redirectResponse = NextResponse.redirect(fullRedirectUrl, 303);

    // Copy cookies from our response to the redirect response
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });

    return redirectResponse;
  } catch (error) {
    console.error("[test/direct-auth] unexpected error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
