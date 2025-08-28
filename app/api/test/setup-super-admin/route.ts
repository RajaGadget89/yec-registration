import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  console.log("[setup-super-admin] E2E_TESTS:", process.env.E2E_TESTS);
  console.log("[setup-super-admin] NODE_ENV:", process.env.NODE_ENV);
  
  // 1. Guard non-test environments
  if (process.env.E2E_TESTS !== "true" && process.env.NODE_ENV === "production") {
    console.log("[setup-super-admin] Access denied - not in test environment");
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  try {
    console.log("[setup-super-admin] Starting setup process");
    // 2. Use the super admin email
    const email = "raja.gadgets89@gmail.com";

    // 3. Create admin client with Service Role
    console.log("[setup-super-admin] Creating Supabase admin client");
    console.log("[setup-super-admin] SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("[setup-super-admin] Has service role key:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    
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

    // 4. Use admin API to create or get user
    let userId: string;
    try {
      // Try to get user by email using the admin API
      const { data: existingUser } = await adminClient.auth.admin.listUsers();

      // Find user by email in the list
      const user = existingUser.users.find((u) => u.email === email);

      if (user) {
        userId = user.id;
        console.log("[setup-super-admin] Found existing user:", userId);
      } else {
        // User doesn't exist, create them
        const { data: newUser, error: createError } =
          await adminClient.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { source: "test-setup-super-admin" },
          });

        if (createError) {
          // If user already exists (race condition), try to find them again
          if (createError.message.includes("already been registered")) {
            const { data: retryUser } = await adminClient.auth.admin.listUsers();
            const retryFoundUser = retryUser.users.find((u) => u.email === email);
            if (retryFoundUser) {
              userId = retryFoundUser.id;
              console.log("[setup-super-admin] Found user on retry:", userId);
            } else {
              console.error("[setup-super-admin] createUser error:", createError);
              return NextResponse.json(
                {
                  ok: false,
                  reason: "CREATE_USER_ERROR",
                  message: createError.message,
                },
                { status: 500 },
              );
            }
          } else {
            console.error("[setup-super-admin] createUser error:", createError);
            return NextResponse.json(
              {
                ok: false,
                reason: "CREATE_USER_ERROR",
                message: createError.message,
              },
              { status: 500 },
            );
          }
        } else {
          userId = newUser.user.id;
          console.log("[setup-super-admin] Created new user:", userId);
        }
      }
    } catch (error) {
      console.error("[setup-super-admin] error checking/creating user:", error);
      return NextResponse.json(
        {
          ok: false,
          reason: "USER_CHECK_ERROR",
          message: "Failed to check or create user",
        },
        { status: 500 },
      );
    }

    // 5. Seed super admin user into admin_users table
    const { error: seedError } = await adminClient.from("admin_users").upsert(
      {
        id: userId,
        email: email.toLowerCase(),
        role: "super_admin", // Set as super_admin
        is_active: true,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "email",
      },
    );

    if (seedError) {
      console.error("[setup-super-admin] admin seeding error:", seedError);
      return NextResponse.json(
        { ok: false, reason: "ADMIN_SEED_ERROR", message: seedError.message },
        { status: 500 },
      );
    }

    // 6. Verify the user was created properly
    const { data: verifyUser, error: verifyError } = await adminClient
      .from("admin_users")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    if (verifyError || !verifyUser) {
      console.error("[setup-super-admin] verification error:", verifyError);
      return NextResponse.json(
        { ok: false, reason: "VERIFICATION_ERROR", message: "Failed to verify user creation" },
        { status: 500 },
      );
    }

    console.log("[setup-super-admin] Successfully set up super admin:", {
      email,
      userId,
      role: verifyUser.role,
      status: verifyUser.status,
    });

    return NextResponse.json({
      ok: true,
      email,
      userId,
      role: verifyUser.role,
      status: verifyUser.status,
    });

  } catch (e: unknown) {
    console.error("[setup-super-admin] unexpected error:", e);
    const errorMessage =
      e instanceof Error ? e.message : "Unexpected error during super admin setup";
    return NextResponse.json(
      { ok: false, reason: "UNEXPECTED_ERROR", message: errorMessage },
      { status: 500 },
    );
  }
}
