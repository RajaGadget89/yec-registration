import { NextResponse } from "next/server";
import { getSupabaseAuth } from "../../../lib/auth-client";
import { getCookieOptions } from "../../../lib/env";

export async function POST() {
  try {
    const supabase = getSupabaseAuth();

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
    }

    // Create response with cleared cookies
    const response = NextResponse.json({ success: true });

    // Get cookie options for consistent settings
    const cookieOpts = getCookieOptions();
    const clearOptions = {
      ...cookieOpts,
      maxAge: 0,
      expires: new Date(0),
    };

    // Clear all authentication cookies with proper domain settings
    response.cookies.set("sb-access-token", "", clearOptions);
    response.cookies.set("sb-refresh-token", "", clearOptions);
    response.cookies.set("admin-email", "", clearOptions);
    response.cookies.set("dev-user-email", "", clearOptions);

    // Clear the new Supabase auth token format (includes project ref)
    const projectRef =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.split(".")[0]?.split("//")[1];
    if (projectRef) {
      response.cookies.set(`sb-${projectRef}-auth-token`, "", clearOptions);
    }

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  // Redirect GET requests to POST
  return POST();
}
