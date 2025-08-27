import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertDbRouting } from "../../../lib/env-guards";
import { logAccess } from "../../../lib/audit/auditClient";
import { isE2E } from "../../../lib/env/isE2E";

export const dynamic = "force-dynamic";

interface DeepLinkRequest {
  recipientEmail: string;
  emailType?: "update_request" | "tracking";
}

/**
 * Test-only endpoint to retrieve deep-link URLs from email outbox
 * Only works when E2E_TEST_MODE=true
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Check if E2E test mode is enabled
    if (!isE2E()) {
      await logAccess({
        action: "test.deep_link.retrieve",
        method: "POST",
        resource: "/api/test/deep-link",
        result: "forbidden",
        request_id: requestId,
        src_ip: request.headers.get("x-forwarded-for") || undefined,
        user_agent: request.headers.get("user-agent") || undefined,
        meta: { reason: "E2E_TEST_MODE not enabled" },
      });
      return new Response("Forbidden", { status: 403 });
    }

    // Parse request body
    const body: DeepLinkRequest = await request.json();
    const { recipientEmail, emailType = "update_request" } = body;

    if (!recipientEmail) {
      await logAccess({
        action: "test.deep_link.retrieve",
        method: "POST",
        resource: "/api/test/deep-link",
        result: "bad_request",
        request_id: requestId,
        src_ip: request.headers.get("x-forwarded-for") || undefined,
        user_agent: request.headers.get("user-agent") || undefined,
        meta: { reason: "Missing recipientEmail in request body" },
      });
      return NextResponse.json(
        { error: "Recipient email is required" },
        { status: 400 },
      );
    }

    // Create Supabase service client
    assertDbRouting();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Query email outbox for the latest email to the recipient
    let query = supabase
      .from("email_outbox")
      .select("id, template, to_email, payload, created_at")
      .eq("to_email", recipientEmail)
      .order("created_at", { ascending: false })
      .limit(1);

    // Filter by email type if specified
    if (emailType === "update_request") {
      query = query.eq("template", "review.request_update");
    } else if (emailType === "tracking") {
      query = query.eq("template", "registration.created");
    }

    const { data: emails, error } = await query;

    if (error) {
      await logAccess({
        action: "test.deep_link.retrieve",
        method: "POST",
        resource: "/api/test/deep-link",
        result: "error",
        request_id: requestId,
        src_ip: request.headers.get("x-forwarded-for") || undefined,
        user_agent: request.headers.get("user-agent") || undefined,
        meta: { recipientEmail, error: error.message },
      });
      return NextResponse.json(
        { error: "Failed to query email outbox" },
        { status: 500 },
      );
    }

    if (!emails || emails.length === 0) {
      await logAccess({
        action: "test.deep_link.retrieve",
        method: "POST",
        resource: "/api/test/deep-link",
        result: "not_found",
        request_id: requestId,
        src_ip: request.headers.get("x-forwarded-for") || undefined,
        user_agent: request.headers.get("user-agent") || undefined,
        meta: { recipientEmail, emailType },
      });
      return NextResponse.json(
        { error: "No emails found for recipient" },
        { status: 404 },
      );
    }

    const email = emails[0];
    const payload = email.payload as any;

    // Extract deep-link URL from email payload
    let deepLinkUrl: string | null = null;

    if (emailType === "update_request" && payload?.ctaUrl) {
      // For update request emails, the CTA URL is the deep link
      deepLinkUrl = payload.ctaUrl;
    } else if (emailType === "tracking" && payload?.trackingUrl) {
      // For tracking emails, the tracking URL might contain the deep link
      deepLinkUrl = payload.trackingUrl;
    }

    // If no direct URL found, try to extract from email body or other fields
    if (!deepLinkUrl && payload?.emailBody) {
      // Look for update URL pattern in email body
      const updateUrlMatch = payload.emailBody.match(
        /\/update\?token=[^\s"']+/,
      );
      if (updateUrlMatch) {
        deepLinkUrl = updateUrlMatch[0];
      }
    }

    if (!deepLinkUrl) {
      await logAccess({
        action: "test.deep_link.retrieve",
        method: "POST",
        resource: "/api/test/deep-link",
        result: "not_found",
        request_id: requestId,
        src_ip: request.headers.get("x-forwarded-for") || undefined,
        user_agent: request.headers.get("user-agent") || undefined,
        meta: {
          recipientEmail,
          emailType,
          reason: "No deep link found in email",
        },
      });
      return NextResponse.json(
        { error: "No deep link found in email" },
        { status: 404 },
      );
    }

    // Ensure the URL is absolute
    if (!deepLinkUrl.startsWith("http")) {
      deepLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL}${deepLinkUrl}`;
    }

    // Log successful retrieval
    await logAccess({
      action: "test.deep_link.retrieve",
      method: "POST",
      resource: "/api/test/deep-link",
      result: "success",
      request_id: requestId,
      src_ip: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
      meta: { recipientEmail, emailType, emailId: email.id },
    });

    return NextResponse.json({
      success: true,
      deepLinkUrl,
      emailId: email.id,
      template: email.template,
      createdAt: email.created_at,
    });
  } catch (error) {
    console.error("[test/deep-link] unexpected error:", error);

    await logAccess({
      action: "test.deep_link.retrieve",
      method: "POST",
      resource: "/api/test/deep-link",
      result: "error",
      request_id: requestId,
      src_ip: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
      meta: { error: error instanceof Error ? error.message : "Unknown error" },
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
