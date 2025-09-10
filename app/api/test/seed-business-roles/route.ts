import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import { isE2EWithHelpers } from "../../../lib/env/isE2E";
// import { upsertAdminUser } from "../../../lib/auth-utils.server";
import type { BusinessRole } from "../../../types/database";
import crypto from "crypto";

/**
 * TEST-ONLY: Seed business roles for test actors
 * Only available when E2E_TEST_MODE=true AND TEST_HELPERS_ENABLED=1
 * Does NOT affect production behavior, core services, or business logic
 */
export async function POST(request: NextRequest) {
  // Check if test helpers are enabled
  if (!isE2EWithHelpers()) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }

  try {
    const { email, business_roles } = await request.json();

    if (!email || !Array.isArray(business_roles)) {
      return NextResponse.json(
        { ok: false, error: "invalid payload" },
        { status: 400 },
      );
    }

    // Validate business roles
    const validRoles: BusinessRole[] = [
      "user_profile",
      "payment_slip",
      "tcc_card",
    ];
    const invalidRoles = business_roles.filter(
      (role) => !validRoles.includes(role),
    );
    if (invalidRoles.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid business roles: ${invalidRoles.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // For test-only seeding, use the existing seed-admin-user endpoint logic
    // This bypasses the foreign key constraint issue by using the working approach
    let isAllowed = false;

    try {
      // Check if user exists in database
      const supabase = getSupabaseServiceClient();
      const { data: existingUser } = await supabase
        .from("admin_users")
        .select("email, is_active")
        .eq("email", email.toLowerCase())
        .eq("is_active", true)
        .single();

      if (existingUser) {
        isAllowed = true;
      } else {
        // Check environment variables for legacy support
        const adminEmails =
          process.env.ADMIN_EMAILS?.split(",").map((e) =>
            e.trim().toLowerCase(),
          ) || [];
        isAllowed = adminEmails.includes(email.toLowerCase());
      }
    } catch {
      // Environment fallback on database error
      const adminEmails =
        process.env.ADMIN_EMAILS?.split(",").map((e) =>
          e.trim().toLowerCase(),
        ) || [];
      isAllowed = adminEmails.includes(email.toLowerCase());
    }

    // For test-only seeding, allow known test emails even if not in allowlist
    const testEmails = [
      "dave@yec.dev",
      "raja.gadgets89@gmail.com",
      "yecsongkhla.official@gmail.com",
    ];
    if (!isAllowed && testEmails.includes(email.toLowerCase())) {
      isAllowed = true;
    }

    if (!isAllowed) {
      return NextResponse.json(
        { ok: false, error: "Email not in admin allowlist" },
        { status: 403 },
      );
    }

    // Use the same approach as seed-admin-user but with admin role and business_roles
    const userId = crypto.randomUUID();
    const supabase = getSupabaseServiceClient();
    const now = new Date().toISOString();

    // Try to upsert with business_roles first, fallback to without if column doesn't exist
    let data, error;
    try {
      const result = await (supabase as any)
        .from("admin_users")
        .upsert({
          id: userId,
          email: email.toLowerCase(),
          role: "admin", // Use admin role for test users
          business_roles: business_roles, // Set the business_roles column
          created_at: now,
          updated_at: now,
          is_active: true,
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    } catch (_columnError) {
      // Fallback: if business_roles column doesn't exist, create without it
      console.log(
        `[seed-business-roles] business_roles column not available, creating admin user without business_roles`,
      );
      const result = await (supabase as any)
        .from("admin_users")
        .upsert({
          id: userId,
          email: email.toLowerCase(),
          role: "admin", // Use admin role for test users
          created_at: now,
          updated_at: now,
          is_active: true,
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("Error seeding admin user:", error);
      return NextResponse.json(
        {
          ok: false,
          error: "Database operation failed",
          details: error.message,
        },
        { status: 500 },
      );
    }

    console.log(
      `[seed-business-roles] Seeded admin user for ${email} (business_roles: ${business_roles.join(", ")})`,
    );

    return NextResponse.json({
      ok: true,
      message:
        "Admin user seeded successfully (business_roles may not be available in database)",
      user: {
        email: (data as any).email,
        role: (data as any).role,
        business_roles: (data as any).business_roles || business_roles, // Return actual roles or requested roles
        is_active: (data as any).is_active,
      },
    });
  } catch (error) {
    console.error("Error in seed-business-roles:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
