import { NextRequest, NextResponse } from "next/server";

/**
 * Test endpoint to set admin-email cookie for testing
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
    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];
    if (!adminEmails.includes(email.toLowerCase())) {
      return NextResponse.json({ error: "Email not in admin allowlist" }, { status: 403 });
    }

    // Create response with admin-email cookie
    const response = NextResponse.json({
      success: true,
      message: "Admin email cookie set",
      email: email
    });

    // Set admin-email cookie (this is what the admin guard checks)
    response.cookies.set("admin-email", email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 20 // 20 days
    });

    console.log(`[set-admin-cookie] Admin email cookie set for ${email}`);

    return response;

  } catch (error) {
    console.error("Error setting admin cookie:", error);
    return NextResponse.json({
      error: "Failed to set admin cookie",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
