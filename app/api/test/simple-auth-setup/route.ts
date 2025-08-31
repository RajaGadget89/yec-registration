import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuth } from "../../../lib/auth-client";

/**
 * Simple test endpoint to set up authentication for testing
 * Only available in development and E2E test environments
 * Does NOT affect core services, domain events, or AC1-AC6 workflows
 *
 * This endpoint:
 * 1. Sets admin-email cookie
 * 2. Returns success response
 * 3. Works with existing magic link system
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

    // Create Supabase client
    const supabase = getSupabaseAuth();

    // Database-first approach: Verify user is in admin allowlist
    let isAllowed = false;
    
    try {
      // Step 1: Check if user exists in database
      const { data: existingUser } = await supabase
        .from("admin_users")
        .select("email, is_active")
        .eq("email", email.toLowerCase())
        .eq("is_active", true)
        .single();
      
      if (existingUser) {
        isAllowed = true;
      } else {
        // Step 2: Check environment variables for legacy support
        const adminEmails =
          process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ||
          [];
        isAllowed = adminEmails.includes(email.toLowerCase());
      }
    } catch {
      // Step 3: Environment fallback on database error
      const adminEmails =
        process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ||
        [];
      isAllowed = adminEmails.includes(email.toLowerCase());
    }
    
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Email not in admin allowlist" },
        { status: 403 },
      );
    }

    // Create response with success message
    const response = NextResponse.json({
      success: true,
      message: "Simple authentication setup completed",
      email: email,
      instructions: [
        "1. Admin email cookie has been set",
        "2. Complete magic link authentication flow",
        "3. User will be automatically created in database",
        "4. All authoritative conditions will be met",
      ],
      next_steps: [
        "Navigate to: http://localhost:8080/admin/login",
        "Enter email: " + email,
        "Click 'Send Magic Link'",
        "Check email and click magic link",
        "Access: http://localhost:8080/admin/management",
      ],
    });

    // Set admin-email cookie
    response.cookies.set("admin-email", email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 20, // 20 days
    });

    console.log(`[simple-auth-setup] Simple auth setup completed for ${email}`);

    return response;
  } catch (error) {
    console.error("Error in simple auth setup:", error);
    return NextResponse.json(
      {
        error: "Failed to complete simple auth setup",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
