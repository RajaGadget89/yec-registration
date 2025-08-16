import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuth } from "../../../lib/auth-client";
import { upsertAdminUser } from "../../../lib/auth-utils.server";

/**
 * Seed admin users from ADMIN_EMAILS environment variable
 * This route should only be used during initial setup
 */
export async function POST(request: NextRequest) {
  try {
    // Check if we're in development or if a secret key is provided
    const { searchParams } = new URL(request.url);
    const secretKey = searchParams.get("secret");

    if (
      process.env.NODE_ENV === "production" &&
      secretKey !== process.env.ADMIN_SEED_SECRET
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminEmails =
      process.env.ADMIN_EMAILS?.split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean) || [];

    if (adminEmails.length === 0) {
      return NextResponse.json(
        { error: "No admin emails found in ADMIN_EMAILS environment variable" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAuth();
    const results: Array<{ email: string; success: boolean; error?: string }> =
      [];

    for (const email of adminEmails) {
      try {
        // Check if user exists in Supabase Auth
        const {
          data: { users },
          error: listError,
        } = await supabase.auth.admin.listUsers();

        if (listError) {
          results.push({ email, success: false, error: listError.message });
          continue;
        }

        const existingUser = users?.find((user) => user.email === email);

        if (!existingUser) {
          // Create user in Supabase Auth
          const { data: newUser, error: createError } =
            await supabase.auth.admin.createUser({
              email,
              password: generateTemporaryPassword(),
              email_confirm: true,
            });

          if (createError) {
            results.push({ email, success: false, error: createError.message });
            continue;
          }

          if (newUser.user) {
            // Add to admin_users table
            const adminUser = await upsertAdminUser({
              id: newUser.user.id,
              email: newUser.user.email!,
              role: "admin", // Default to admin role
            });

            if (adminUser) {
              results.push({ email, success: true });
            } else {
              results.push({
                email,
                success: false,
                error: "Failed to create admin user record",
              });
            }
          }
        } else {
          // User exists, just add to admin_users table
          const adminUser = await upsertAdminUser({
            id: existingUser.id,
            email: existingUser.email!,
            role: "admin", // Default to admin role
          });

          if (adminUser) {
            results.push({ email, success: true });
          } else {
            results.push({
              email,
              success: false,
              error: "Failed to create admin user record",
            });
          }
        }
      } catch (error) {
        results.push({
          email,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `Seeded ${successCount} admin users successfully${failureCount > 0 ? `, ${failureCount} failed` : ""}`,
      results,
      total: adminEmails.length,
      success: successCount,
      failures: failureCount,
    });
  } catch (error) {
    console.error("Seed users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Generate a temporary password for new users
 * Users should change this password on first login
 */
function generateTemporaryPassword(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
