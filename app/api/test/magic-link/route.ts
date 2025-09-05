import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import { getAppUrl } from "../../../lib/auth-utils";
import { isE2E } from "../../../lib/env/isE2E";
import { getEmailTransport } from "../../../lib/emails/transport";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Check if E2E test mode is enabled
  if (!isE2E()) {
    return new Response("Forbidden", { status: 403 });
  }

  // Disable in production
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);

  // Get email from query, then TEST_ADMIN_EMAIL, then first from ADMIN_EMAILS
  const email =
    searchParams.get("email") ||
    process.env.TEST_ADMIN_EMAIL ||
    process.env.ADMIN_EMAILS?.split(",")[0]?.trim() ||
    "";

  if (!email) {
    return NextResponse.json(
      {
        ok: false,
        reason: "MISSING_EMAIL",
        message: "Email parameter or TEST_ADMIN_EMAIL/ADMIN_EMAILS is required",
      },
      { status: 400 },
    );
  }

  // Validate required environment variables
  const requiredEnvs = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_APP_URL",
  ];

  const missingEnvs = requiredEnvs.filter((env) => !process.env[env]);

  if (missingEnvs.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        reason: "MISSING_ENV",
        missing: missingEnvs,
        message: `Missing required environment variables: ${missingEnvs.join(", ")}`,
      },
      { status: 500 },
    );
  }

  const appUrl = getAppUrl();
  const redirectTo = `${appUrl}/auth/callback`;

  console.log("[magic-link] Generating magic link for:", {
    email,
    redirectTo,
    appUrl,
    envAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    vercelUrl: process.env.VERCEL_URL,
    vercelEnv: process.env.VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV,
    requestUrl: request.url,
    requestOrigin: new URL(request.url).origin,
  });

  try {
    const supabase = getSupabaseServiceClient();

    // First, check if the user exists in Supabase auth
    const { data: authUsers, error: userError } =
      await supabase.auth.admin.listUsers();

    if (userError) {
      console.error("[magic-link] User lookup error:", userError);
      return NextResponse.json(
        {
          ok: false,
          reason: "USER_LOOKUP_ERROR",
          message: `Error looking up users: ${userError.message}`,
          hint: "Check Supabase service role key permissions",
          email,
        },
        { status: 500 },
      );
    }

    const authUser = authUsers.users.find((user) => user.email === email);
    if (!authUser) {
      console.error("[magic-link] User not found:", email);
      return NextResponse.json(
        {
          ok: false,
          reason: "USER_NOT_FOUND",
          message: `User with email ${email} not found in Supabase auth`,
          hint: "Make sure the user exists in your Supabase auth users table",
          email,
        },
        { status: 404 },
      );
    }

    console.log("[magic-link] User found:", {
      userId: authUser.id,
      email: authUser.email,
    });

    console.log("[magic-link] Calling supabase.auth.admin.generateLink with:", {
      type: "magiclink",
      email,
      redirectTo,
    });

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.error("[magic-link] Generation error:", error);
      return NextResponse.json(
        {
          ok: false,
          reason: "SUPABASE_ERROR",
          message: error.message,
          hint: "Check if the email exists in your Supabase auth users and has admin privileges",
          redirectTo,
          email,
        },
        { status: 500 },
      );
    }

    console.log("[magic-link] Successfully generated link:", {
      actionLink: data.properties.action_link,
      email,
      redirectTo,
      dataProperties: data.properties,
    });

    // Send the magic link via email
    try {
      const emailTransport = getEmailTransport();

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">YEC Admin Login (Test)</h2>
          <p>Click the link below to sign in to your admin account:</p>
          <a href="${data.properties.action_link}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Sign In to Admin Dashboard
          </a>
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${data.properties.action_link}">${data.properties.action_link}</a>
          </p>
          <p style="color: #666; font-size: 12px;">
            This link will expire in 1 hour for security reasons.
          </p>
        </div>
      `;

      const emailResult = await emailTransport.send({
        to: email,
        subject: "YEC Admin Login - Magic Link (Test)",
        html: emailHtml,
      });

      if (emailResult.ok) {
        console.log("[magic-link] Test email sent successfully to:", email);
      } else {
        console.error(
          "[magic-link] Test email sending failed:",
          emailResult.reason,
        );
      }
    } catch (emailError) {
      console.error("[magic-link] Test email sending error:", emailError);
    }

    return NextResponse.json({
      ok: true,
      actionLink: data.properties.action_link,
      email,
      redirectTo,
      debug: {
        appUrl,
        envAppUrl: process.env.NEXT_PUBLIC_APP_URL,
        requestOrigin: new URL(request.url).origin,
      },
    });
  } catch (error) {
    console.error("[magic-link] Unexpected error:", error);
    return NextResponse.json(
      {
        ok: false,
        reason: "UNEXPECTED_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        email,
        redirectTo,
      },
      { status: 500 },
    );
  }
}
