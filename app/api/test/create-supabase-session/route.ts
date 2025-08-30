import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuth } from "../../../lib/auth-client";

/**
 * Test endpoint to create a proper Supabase session
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

    // Create Supabase client
    const supabase = getSupabaseAuth();

    // First, ensure admin user exists in database
    const { data: existingUser, error: checkError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Error checking existing user:", checkError);
      return NextResponse.json({
        error: "Failed to check existing user",
        details: checkError.message
      }, { status: 500 });
    }

    let adminUser;

    if (existingUser) {
      // Update existing user to ensure it's active and has super_admin role
      const { data: updatedUser, error: updateError } = await supabase
        .from('admin_users')
        .update({
          role: 'super_admin',
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('email', email)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating user:", updateError);
        return NextResponse.json({
          error: "Failed to update user",
          details: updateError.message
        }, { status: 500 });
      }

      adminUser = updatedUser;
    } else {
      // Create new user
      const userId = crypto.randomUUID();
      const { data: newUser, error: insertError } = await supabase
        .from('admin_users')
        .insert({
          id: userId,
          email: email,
          role: 'super_admin',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating user:", insertError);
        return NextResponse.json({
          error: "Failed to create user",
          details: insertError.message
        }, { status: 500 });
      }

      adminUser = newUser;
    }

    // Now create a magic link for the user
    const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/admin/management`
      }
    });

    if (magicLinkError) {
      console.error("Error generating magic link:", magicLinkError);
      return NextResponse.json({
        error: "Failed to generate magic link",
        details: magicLinkError.message
      }, { status: 500 });
    }

    // Create response with instructions
    const response = NextResponse.json({
      success: true,
      message: "Supabase session setup completed",
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        is_active: adminUser.is_active
      },
      magic_link: magicLinkData.properties.action_link,
      instructions: [
        "1. Admin user created/updated in database",
        "2. Magic link generated for Supabase session",
        "3. Click the magic link to establish session",
        "4. Access management page after session is established"
      ],
      next_steps: [
        "Click the magic link above",
        "This will establish a proper Supabase session",
        "Then navigate to: http://localhost:8080/admin/management"
      ]
    });

    // Set admin-email cookie as backup
    response.cookies.set("admin-email", email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 20 // 20 days
    });

    console.log(`[create-supabase-session] Setup completed for ${email}`);
    console.log(`   Magic link: ${magicLinkData.properties.action_link}`);

    return response;

  } catch (error) {
    console.error("Error creating Supabase session:", error);
    return NextResponse.json({
      error: "Failed to create Supabase session",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
