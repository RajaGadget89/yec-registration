import { testEmailConnection } from "../../lib/emailService";

export async function GET() {
  try {
    console.log("Testing email connection...");

    // Check environment variables
    const envCheck = {
      hasResendKey: !!process.env.RESEND_API_KEY,
      resendKeyLength: process.env.RESEND_API_KEY?.length || 0,
    };

    console.log("Environment check:", envCheck);

    if (!process.env.RESEND_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "Email service not configured",
          message: "RESEND_API_KEY environment variable is not set",
          envCheck,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Test email connection
    const isConnected = await testEmailConnection();

    return new Response(
      JSON.stringify({
        success: isConnected,
        message: isConnected
          ? "Email service is working"
          : "Email service test failed",
        envCheck,
      }),
      {
        status: isConnected ? 200 : 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Email test error:", error);
    return new Response(
      JSON.stringify({
        error: "Email test failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
