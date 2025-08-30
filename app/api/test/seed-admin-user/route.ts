import { NextRequest, NextResponse } from "next/server";
import { upsertAdminUser } from "../../../lib/auth-utils.server";

/**
 * Test endpoint to seed admin user in database
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

    // Generate a UUID for the user
    const userId = crypto.randomUUID();

    // Upsert admin user (safe operation - won't affect existing data)
    const adminUser = await upsertAdminUser({
      id: userId,
      email: email,
      role: "super_admin",
    });

    if (!adminUser) {
      return NextResponse.json(
        {
          error: "Failed to seed admin user",
          details: "Database operation failed",
        },
        { status: 500 },
      );
    }

    console.log(
      `[seed-admin-user] Admin user seeded: ${email} with role: super_admin`,
    );

    return NextResponse.json({
      success: true,
      message: "Admin user seeded successfully",
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        is_active: adminUser.is_active,
        created_at: adminUser.created_at,
      },
    });
  } catch (error) {
    console.error("Error seeding admin user:", error);
    return NextResponse.json(
      {
        error: "Failed to seed admin user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
