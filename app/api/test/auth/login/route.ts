import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCookieOptions } from "../../../../lib/env";
import { getSupabaseServiceClient } from "../../../../lib/supabase-server";
import { getRolesForEmail } from "../../../../lib/rbac";
import { isE2EWithHelpers } from "../../../../lib/env/isE2E";

export const dynamic = "force-dynamic";

/**
 * Test-only authentication endpoint for E2E testing
 * Only works when E2E_TEST_MODE=true AND TEST_HELPERS_ENABLED=1 and with valid HMAC
 */
export async function POST(request: NextRequest) {
  // Check if E2E test mode with helpers is enabled
  if (!isE2EWithHelpers()) {
    return new Response("Forbidden", { status: 403 });
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

    if (authHeader !== expectedHmac) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 403 },
      );
    }

    // Expand test allowlist when E2E flags are enabled
    const testActors = [
      "raja.gadgets89@gmail.com",
      "dave@yec.dev",
      "test@example.com",
      "alice@yec.dev",
      "yecsongkhla.official@gmail.com",
    ];

    // Allow test actors when E2E helpers are enabled
    const isTestActor = testActors.includes(email.toLowerCase());
    if (!isTestActor) {
      return NextResponse.json(
        { error: "Email not in test allowlist" },
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
    const userId = crypto.randomUUID();

    // Create admin user in admin_users table with correct role based on RBAC
    const supabase = getSupabaseServiceClient();

    // Determine the correct role and business roles based on RBAC configuration
    let role = "admin"; // Default role
    const roles = getRolesForEmail(email);
    const businessRoles: string[] = [];

    if (roles.has("super_admin")) {
      role = "super_admin";
      // Super admin has all business roles
      businessRoles.push("user_profile", "payment_slip", "tcc_card");
    } else {
      // Map RBAC roles to business roles
      if (roles.has("admin_payment")) {
        businessRoles.push("payment_slip");
      }
      if (roles.has("admin_profile")) {
        businessRoles.push("user_profile");
      }
      if (roles.has("admin_tcc")) {
        businessRoles.push("tcc_card");
      }
    }

    // Try to upsert with business_roles first, fallback to without if column doesn't exist
    let upsertResult, upsertError;
    try {
      const result = await (supabase as any).from("admin_users").upsert(
        {
          id: userId,
          email: email.toLowerCase(),
          role: role,
          business_roles: businessRoles,
          is_active: true,
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
        },
        {
          onConflict: "email",
        },
      );
      upsertResult = result.data;
      upsertError = result.error;
    } catch (_columnError) {
      // Fallback: if business_roles column doesn't exist, create without it
      console.log(
        `[test/auth/login] business_roles column not available, creating admin user without business_roles`,
      );
      const result = await (supabase as any).from("admin_users").upsert(
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
      upsertResult = result.data;
      upsertError = result.error;
    }

    // Debug logging for E2E tests
    if (process.env.E2E_TEST_MODE === "true") {
      console.log(`[DEBUG] Admin user upsert for ${email}:`);
      console.log(`  - Role: ${role}`);
      console.log(`  - Business roles: ${JSON.stringify(businessRoles)}`);
      console.log(`  - Upsert result:`, upsertResult);
      console.log(`  - Upsert error:`, upsertError);
    }

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
    console.error("[test/auth/login] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
