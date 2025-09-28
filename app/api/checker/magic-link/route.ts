import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "../../../lib/supabase-server";
import { getAppUrl } from "../../../lib/env";
import { getEmailTransport } from "../../../lib/emails/transport";

/**
 * Checker-specific magic link endpoint
 * This generates magic links for checker admin operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServiceClient();
    const appUrl = getAppUrl();
    const redirectTo = `${appUrl}/checker/callback`;

    console.log("[checker-magic-link] Generating magic link:", {
      email,
      redirectTo,
      appUrl,
    });

    // Generate magic link using service role client (bypasses rate limiting)
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.error("[checker-magic-link] Generation error:", error);
      return NextResponse.json(
        { error: "Failed to generate magic link", details: error.message },
        { status: 500 },
      );
    }

    const actionLink = data?.properties?.action_link;

    if (!actionLink) {
      return NextResponse.json(
        { error: "No action link generated" },
        { status: 500 },
      );
    }

    console.log("[checker-magic-link] Magic link generated successfully");

    // Send the magic link via email
    try {
      const emailTransport = getEmailTransport();

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">YEC Checker Admin Login</h2>
          <p>Click the link below to access the checker admin operation page:</p>
          <a href="${actionLink}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Access Checker Admin Operations
          </a>
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${actionLink}">${actionLink}</a>
          </p>
          <p style="color: #666; font-size: 12px;">
            This link will expire in 1 hour for security reasons.
          </p>
        </div>
      `;

      const emailResult = await emailTransport.send({
        to: email,
        subject: "YEC Checker Admin Login - Magic Link",
        html: emailHtml,
      });

      if (emailResult.ok) {
        console.log("[checker-magic-link] Email sent successfully to:", email);
        return NextResponse.json({
          success: true,
          message: "Magic link sent! Check your email.",
          actionLink,
        });
      } else {
        console.error("[checker-magic-link] Email sending failed:", emailResult.reason);
        return NextResponse.json({
          success: true,
          message:
            "Magic link generated but email sending failed. Use the direct link below.",
          actionLink,
          warning: "Email delivery failed - please use the direct link",
        });
      }
    } catch (emailError) {
      console.error("[checker-magic-link] Email error:", emailError);
      return NextResponse.json({
        success: true,
        message:
          "Magic link generated but email sending failed. Use the direct link below.",
        actionLink,
        warning: "Email delivery failed - please use the direct link",
      });
    }
  } catch (error) {
    console.error("[checker-magic-link] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
