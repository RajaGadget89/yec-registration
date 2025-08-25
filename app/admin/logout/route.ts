import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "../../lib/supabase-server";
import { getCookieOptions } from "../../lib/env";

export async function GET(request: NextRequest) {
  try {
    // Create response object for cookie management
    const response = NextResponse.json({ success: true });

    // Get Supabase client with cookie management
    const { supabase } = getServerSupabase(request, response);

    // Sign out the user (this will clear the session)
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign out error:", error);
    }

    // Create redirect response to login page
    const redirectResponse = NextResponse.redirect(
      new URL("/admin/login", request.url),
    );

    // Copy the cleared cookies from the Supabase response
    const setCookieHeaders = response.headers.get("Set-Cookie");
    if (setCookieHeaders) {
      redirectResponse.headers.set("Set-Cookie", setCookieHeaders);
    }

    // Get cookie options for consistent settings
    const cookieOpts = getCookieOptions();
    const clearOptions = {
      ...cookieOpts,
      maxAge: 0,
      expires: new Date(0),
    };

    // Clear all authentication cookies with proper domain settings
    redirectResponse.cookies.set("admin-email", "", clearOptions);
    redirectResponse.cookies.set("sb-access-token", "", clearOptions);
    redirectResponse.cookies.set("sb-refresh-token", "", clearOptions);
    redirectResponse.cookies.set("dev-user-email", "", clearOptions);

    // Clear the new Supabase auth token format (includes project ref)
    const projectRef =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.split(".")[0]?.split("//")[1];
    if (projectRef) {
      redirectResponse.cookies.set(
        `sb-${projectRef}-auth-token`,
        "",
        clearOptions,
      );
    }

    return redirectResponse;
  } catch (error) {
    console.error("Admin logout error:", error);

    // Even if logout fails, redirect to login page
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
}

export async function POST(request: NextRequest) {
  // Handle POST requests the same as GET
  return GET(request);
}
