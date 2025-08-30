import { NextRequest, NextResponse } from "next/server";
import { upsertAdminUser } from "../../../lib/auth-utils.server";

/**
 * Test endpoint to complete authentication setup
 * Only available in development and E2E test environments
 * Does NOT affect core services, domain events, or AC1-AC6 workflows
 * 
 * This endpoint:
 * 1. Seeds admin user in database
 * 2. Sets admin-email cookie
 * 3. Returns complete user object
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
    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];
    if (!adminEmails.includes(email.toLowerCase())) {
      return NextResponse.json({ error: "Email not in admin allowlist" }, { status: 403 });
    }

    // Step 1: Seed admin user in database
    const userId = crypto.randomUUID();
    const adminUser = await upsertAdminUser({
      id: userId,
      email: email,
      role: "super_admin"
    });

    if (!adminUser) {
      return NextResponse.json({
        error: "Failed to seed admin user",
        details: "Database operation failed"
      }, { status: 500 });
    }

    // Step 2: Create response with authentication cookies
    const response = NextResponse.json({
      success: true,
      message: "Authentication setup completed",
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        is_active: adminUser.is_active,
        created_at: adminUser.created_at,
        updated_at: adminUser.updated_at
      },
      setup: {
        database_user_created: true,
        admin_email_cookie_set: true,
        super_admin_role_assigned: true,
        user_active: true
      }
    });

    // Step 3: Set admin-email cookie
    response.cookies.set("admin-email", email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 20 // 20 days
    });

    console.log(`[complete-auth-setup] Authentication setup completed for ${email}`);
    console.log(`   - Database user: ${adminUser.id}`);
    console.log(`   - Role: ${adminUser.role}`);
    console.log(`   - Active: ${adminUser.is_active}`);

    return response;

  } catch (error) {
    console.error("Error completing auth setup:", error);
    return NextResponse.json({
      error: "Failed to complete authentication setup",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
