import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getEmailFromAddress } from "../../../lib/config";

export async function GET(request: NextRequest) {
  // Security check - only allow in test environment
  const testHelpersEnabled = request.headers.get("X-Test-Helpers-Enabled");
  const authHeader = request.headers.get("Authorization");

  if (testHelpersEnabled !== "1" || !authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Test helpers not enabled or unauthorized" },
      { status: 403 },
    );
  }

  const token = authHeader.replace("Bearer ", "");
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: "RESEND_API_KEY not configured",
        status: "not_configured",
      });
    }

    const resend = new Resend(apiKey);
    const fromEmail = getEmailFromAddress();

    // Test 1: Check API key validity by getting domains
    let domainsResult;
    try {
      const { data: domains, error: domainsError } =
        await resend.domains.list();
      domainsResult = {
        success: !domainsError,
        domains: domains || [],
        error: domainsError?.message,
      };
    } catch (error) {
      domainsResult = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Test 2: Try to send a test email with verified domain
    let sendResult;
    try {
      const { data, error } = await resend.emails.send({
        from: getEmailFromAddress(), // Use centralized email configuration
        to: "test@example.com",
        subject: "YEC Email System Test",
        html: "<p>This is a test email to verify the email system is working.</p>",
      });

      sendResult = {
        success: !error,
        data: data || null,
        error: error?.message || null,
      };
    } catch (error) {
      sendResult = {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Test 3: Check domain verification
    let domainVerification = null;
    if (
      domainsResult.success &&
      domainsResult.domains &&
      Array.isArray(domainsResult.domains) &&
      domainsResult.domains.length > 0
    ) {
      const domain = domainsResult.domains.find(
        (d: any) => d.name === "yec.in.th",
      ) as any;
      if (domain) {
        domainVerification = {
          name: domain.name,
          status: domain.status,
          created_at: domain.created_at,
          region: domain.region,
        };
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      apiKey: {
        configured: !!apiKey,
        length: apiKey ? apiKey.length : 0,
        prefix: apiKey ? apiKey.substring(0, 8) + "..." : null,
      },
      fromEmail,
      domains: domainsResult,
      sendTest: sendResult,
      domainVerification,
      recommendations: getRecommendations(
        domainsResult,
        sendResult,
        domainVerification,
      ),
    });
  } catch (error) {
    console.error("Email debug error:", error);
    return NextResponse.json(
      {
        error: "Email debug failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

function getRecommendations(
  domains: any,
  sendTest: any,
  domainVerification: any,
): string[] {
  const recommendations = [];

  if (!domains.success) {
    recommendations.push(
      "RESEND_API_KEY appears to be invalid - check the API key",
    );
  }

  if (
    domains.success &&
    domains.domains &&
    Array.isArray(domains.domains) &&
    domains.domains.length === 0
  ) {
    recommendations.push(
      "No domains found in Resend account - add and verify yec.in.th domain",
    );
  }

  if (domainVerification && domainVerification.status !== "valid") {
    recommendations.push(
      `Domain yec.in.th is not verified (status: ${domainVerification.status}) - complete domain verification in Resend dashboard`,
    );
  }

  if (
    sendTest.error?.includes("rate limit") ||
    sendTest.error?.includes("429")
  ) {
    recommendations.push(
      "Rate limit exceeded - wait before sending more emails or upgrade Resend plan",
    );
  }

  if (
    sendTest.error?.includes("unauthorized") ||
    sendTest.error?.includes("401")
  ) {
    recommendations.push(
      "API key is unauthorized - check API key permissions in Resend dashboard",
    );
  }

  if (sendTest.error?.includes("from") || sendTest.error?.includes("sender")) {
    recommendations.push(
      "Sender email not verified - verify noreply@yec.in.th in Resend dashboard",
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("Email system appears to be working correctly");
  }

  return recommendations;
}
