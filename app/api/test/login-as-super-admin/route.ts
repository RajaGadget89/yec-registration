import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookieOptions } from "../../../lib/auth-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  // 1. Guard non-test environments
  if (process.env.E2E_TESTS !== "true" && process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  // 2. Use the super admin email from environment or default
  const email = process.env.TEST_ADMIN_EMAIL || "raja.gadgets89@gmail.com";

  if (!email) {
    return NextResponse.json(
      {
        ok: false,
        reason: "MISSING_EMAIL",
        message: "TEST_ADMIN_EMAIL environment variable is required",
      },
      { status: 400 },
    );
  }

  // 3. Create one NextResponse for both cookies and response
  const res = new NextResponse(null, {
    status: 204, // No content, just set cookies
  });

  try {
    // 4. Create admin client with Service Role
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // 5. Use admin API to create or get user
    let userId: string;
    try {
      // Try to get user by email using the admin API
      const { data: existingUser } = await adminClient.auth.admin.listUsers();

      // Find user by email in the list
      const user = existingUser.users.find((u) => u.email === email);

      if (user) {
        userId = user.id;
        console.log("[super-admin-login] Found existing user:", userId);
      } else {
        // User doesn't exist, create them
        const { data: newUser, error: createError } =
          await adminClient.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { source: "test-setup-super-admin" },
          });

        if (createError) {
          console.error("[super-admin-login] createUser error:", createError);
          return NextResponse.json(
            {
              ok: false,
              reason: "CREATE_USER_ERROR",
              message: createError.message,
            },
            { status: 500 },
          );
        }

        userId = newUser.user.id;
        console.log("[super-admin-login] Created new user:", userId);
      }
    } catch (error) {
      console.error("[super-admin-login] error checking/creating user:", error);
      return NextResponse.json(
        {
          ok: false,
          reason: "USER_CHECK_ERROR",
          message: "Failed to check or create user",
        },
        { status: 500 },
      );
    }

    // 6. Seed super admin user into admin_users table
    const { error: seedError } = await adminClient.from("admin_users").upsert(
      {
        id: userId,
        email: email.toLowerCase(),
        role: "super_admin", // Set as super_admin
        is_active: true,
        status: "active",
      },
      {
        onConflict: "email",
      },
    );

    if (seedError) {
      console.error("[super-admin-login] admin seeding error:", seedError);
      return NextResponse.json(
        { ok: false, reason: "ADMIN_SEED_ERROR", message: seedError.message },
        { status: 500 },
      );
    }

    // 7. Set auth cookies for testing
    const options = cookieOptions();

    // Set the required cookies that the auth flow normally sets
    res.cookies.set("admin-email", email, options);
    res.cookies.set("sb-access-token", "test-access-token", options);
    res.cookies.set("sb-refresh-token", "test-refresh-token", options);

    console.log("[super-admin-login] set auth cookies:", {
      "admin-email": email,
      "sb-access-token": "test-access-token",
      "sb-refresh-token": "test-refresh-token",
    });

    // 8. Add debug headers
    res.headers.set("X-Auth-Debug", "super-admin-login:ok");

    console.log("[super-admin-login] success", {
      email,
      userId,
      role: "super_admin",
    });

    // 9. Return the response with cookies set
    return res;
  } catch (e: unknown) {
    console.error("[super-admin-login] unexpected error:", e);
    const errorMessage =
      e instanceof Error ? e.message : "Unexpected error during super admin login";
    return NextResponse.json(
      { ok: false, reason: "UNEXPECTED_ERROR", message: errorMessage },
      { status: 500 },
    );
  }
}
