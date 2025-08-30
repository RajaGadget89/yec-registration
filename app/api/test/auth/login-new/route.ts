import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCookieOptions } from "../../../../lib/env";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { getRolesForEmail } from "../../../../lib/rbac";
import { isE2E } from "../../../../lib/env/isE2E";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Check if E2E test mode is enabled
  const e2eTestMode = process.env.E2E_TEST_MODE;
  const isE2EResult = isE2E();

  if (!isE2EResult) {
    return NextResponse.json(
      {
        error: "E2E test mode not enabled",
        debug: { e2eTestMode, isE2EResult },
      },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Verify HMAC authentication
    const authHeader = request.headers.get("X-E2E-AUTH");
    const e2eAuthSecret = process.env.E2E_AUTH_SECRET;

    console.log("Auth header:", authHeader);
    console.log("E2E_AUTH_SECRET:", e2eAuthSecret);

    if (!authHeader || !e2eAuthSecret) {
      return NextResponse.json(
        { error: "Missing authentication" },
        { status: 403 },
      );
    }

    // Calculate expected HMAC
    const payload = JSON.stringify({ email });
    const expectedHmac = crypto
      .createHmac("sha256", e2eAuthSecret)
      .update(payload)
      .digest("hex");

    console.log("Expected HMAC:", expectedHmac);
    console.log("Received HMAC:", authHeader);

    if (authHeader !== expectedHmac) {
      return NextResponse.json(
        {
          error: "Invalid authentication",
          debug: {
            authHeader,
            expectedHmac,
            payload,
            e2eAuthSecret: e2eAuthSecret ? "SET" : "NOT_SET",
          },
        },
        { status: 403 },
      );
    }

    // Create a mock session for the email
    const cookieOpts = getCookieOptions();
    const response = new NextResponse(null, { status: 204 });

    // Set admin-email cookie for admin guard
    response.cookies.set("admin-email", email, cookieOpts);

    // Set dev-user-email cookie for fallback
    response.cookies.set("dev-user-email", email, cookieOpts);

    // Create or get user ID for admin_users table
    const userId = `test-user-${Date.now()}`;

    // Create admin user in admin_users table with correct role based on RBAC
    const supabase = getSupabaseServiceClient();

    // Determine the correct role based on RBAC configuration
    let role = "admin"; // Default role
    const roles = getRolesForEmail(email);

    if (roles.has("super_admin")) {
      role = "super_admin";
    } else if (
      roles.has("admin_payment") ||
      roles.has("admin_profile") ||
      roles.has("admin_tcc")
    ) {
      role = "admin";
    }

    await supabase.from("admin_users").upsert(
      {
        id: userId,
        email: email.toLowerCase(),
        role: role,
        is_active: true,
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
      },
      {
        onConflict: "email",
      },
    );

    // Create mock Supabase session cookies
    const projectRef = new URL(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
    ).hostname.split(".")[0];
    const sessionData = {
      access_token: `test-access-${Date.now()}`,
      refresh_token: `test-refresh-${Date.now()}`,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: userId,
        email: email,
        created_at: new Date().toISOString(),
      },
    };

    // Set modern Supabase cookie
    const sessionCookie = `base64-${Buffer.from(JSON.stringify(sessionData)).toString("base64")}`;
    response.cookies.set(
      `sb-${projectRef}-auth-token`,
      sessionCookie,
      cookieOpts,
    );

    // Set legacy cookies for compatibility
    response.cookies.set(
      "sb-access-token",
      sessionData.access_token,
      cookieOpts,
    );
    response.cookies.set(
      "sb-refresh-token",
      sessionData.refresh_token,
      cookieOpts,
    );

    return response;
  } catch (error) {
    console.error("[test/auth/login-new] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
