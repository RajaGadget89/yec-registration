import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuth } from "../../../lib/auth-client";
import { upsertAdminUser } from "../../../lib/auth-utils.server";

/**
 * Test endpoint to establish authentication session
 * Only available in development and E2E test environments
 * Does NOT affect core services, domain events, or AC1-AC6 workflows
 */
export async function POST(request: NextRequest) {
  // Only allow in development or E2E test mode
  if (process.env.NODE_ENV === "production" && !process.env.E2E_TEST_MODE) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Verify user is in admin allowlist
    const adminEmails =
      process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ||
      [];
    if (!adminEmails.includes(email.toLowerCase())) {
      return NextResponse.json(
        { error: "Email not in admin allowlist" },
        { status: 403 },
      );
    }

    const supabase = getSupabaseAuth();

    // Create a test session for the admin user
    // This simulates the magic link authentication flow without sending actual emails
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      console.error("Error generating magic link:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create response with authentication cookies
    const response = NextResponse.json({
      success: true,
      message: "Authentication session established",
      email: email,
      actionLink: data.properties.action_link,
    });

    // Set admin-email cookie (this is what the admin guard checks)
    response.cookies.set("admin-email", email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 20, // 20 days
    });

    // Ensure admin user exists in database
    const adminUser = await upsertAdminUser({
      id: data.user.id,
      email: email,
      role: "super_admin", // Default to super_admin for testing
    });

    if (!adminUser) {
      console.warn(
        "Failed to upsert admin user, but continuing with session establishment",
      );
    }

    console.log(`[establish-session] Session established for ${email}`);

    return response;
  } catch (error) {
    console.error("Error establishing session:", error);
    return NextResponse.json(
      {
        error: "Failed to establish session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
