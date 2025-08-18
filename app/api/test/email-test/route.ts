import { NextRequest, NextResponse } from "next/server";
import { getEmailTransport } from "../../../lib/emails/transport";

/**
 * Simple email test endpoint
 * Tests the email transport directly
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email address required" }, { status: 400 });
    }

    console.log(`[EMAIL-TEST] Testing email sending to ${email}`);

    const transport = getEmailTransport();
    
    const result = await transport.send({
      to: email,
      subject: "[TEST] YEC Day Email System Test",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #1A237E;">YEC Day Email System Test</h2>
          <p>This is a test email to verify the email system is working correctly.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
          <p><strong>Email Mode:</strong> ${process.env.EMAIL_MODE}</p>
        </div>
      `,
    });

    console.log(`[EMAIL-TEST] Result:`, result);

    return NextResponse.json({
      success: result.ok,
      result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[EMAIL-TEST] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to send test email",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

