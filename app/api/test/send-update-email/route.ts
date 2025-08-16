import { NextRequest, NextResponse } from "next/server";
import { eventDrivenEmailService } from "../../../lib/emails/enhancedEmailService";

/**
 * Test-only helper endpoint to send update request emails directly
 * Guarded with NODE_ENV === 'test' || TEST_HELPERS_ENABLED === '1' and CRON_SECRET
 */
export async function POST(request: NextRequest) {
  // Security guard: Only allow in test environment
  const isTestEnv =
    process.env.NODE_ENV === "test" ||
    process.env.TEST_HELPERS_ENABLED === "1" ||
    request.headers.get("X-Test-Helpers-Enabled") === "1";
  if (!isTestEnv) {
    return NextResponse.json(
      { error: "Test helpers not enabled" },
      { status: 403 },
    );
  }

  // CRON_SECRET authentication
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  // Check Authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 },
    );
  }

  const token = authHeader.substring(7);
  if (token !== cronSecret) {
    return NextResponse.json({ error: "Invalid CRON_SECRET" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { registration, dimension, notes } = body;

    // Validate required fields
    if (!registration || !dimension) {
      return NextResponse.json(
        { error: "registration and dimension are required" },
        { status: 400 },
      );
    }

    if (!["payment", "profile", "tcc"].includes(dimension)) {
      return NextResponse.json(
        { error: "Invalid dimension. Must be payment, profile, or tcc" },
        { status: 400 },
      );
    }

    // Send update request email using enhanced email service
    const brandTokens = eventDrivenEmailService.getBrandTokens();
    const emailResult = await eventDrivenEmailService.processEvent(
      "review.request_update",
      registration,
      "test-admin@example.com", // Use test admin email
      dimension,
      notes,
      undefined, // no badge URL for update requests
      undefined, // no rejection reason for update requests
      brandTokens,
    );

    if (emailResult) {
      console.log("Update request email sent successfully:", {
        to: emailResult.to,
        template: emailResult.template,
        ctaUrl: emailResult.ctaUrl,
      });

      return NextResponse.json({
        ok: true,
        emailSent: true,
        to: emailResult.to,
        template: emailResult.template,
        trackingCode: emailResult.trackingCode,
      });
    } else {
      return NextResponse.json({
        ok: false,
        emailSent: false,
        error: "Email service returned null result",
      });
    }
  } catch (error) {
    console.error("Error in test send-update-email endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
