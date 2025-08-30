import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseServiceClient } from "../../../../lib/supabase/server";
import { TokenService } from "../../../../lib/tokenService";
import { getBaseUrl } from "../../../../lib/config";
import { isE2E } from "../../../../lib/env/isE2E";

/**
 * Test-only API endpoint for waiting for update request emails
 * Only active when E2E_TEST_MODE === 'true'
 *
 * Query parameters:
 * - to: recipient email (lowercased/trimmed)
 * - dimension: payment|profile|tcc
 * - type: email type (default: "update_request")
 * - timeoutMs: polling timeout in ms (default: 15000)
 * - intervalMs: polling interval in ms (default: 500)
 *
 * Authentication: X-E2E-AUTH header with HMAC
 */

export async function GET(request: NextRequest) {
  // Check if E2E test mode is enabled
  if (!isE2E()) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const to = searchParams.get("to")?.toLowerCase().trim();
    const dimension = searchParams.get("dimension");
    const type = searchParams.get("type") || "update_request";
    const timeoutMs = parseInt(searchParams.get("timeoutMs") || "15000", 10);
    const intervalMs = parseInt(searchParams.get("intervalMs") || "500", 10);

    // Validate required parameters
    if (!to) {
      return NextResponse.json(
        { error: "Missing required parameter: to" },
        { status: 400 },
      );
    }

    if (!dimension || !["payment", "profile", "tcc"].includes(dimension)) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid parameter: dimension (must be payment|profile|tcc)",
        },
        { status: 400 },
      );
    }

    // Validate authentication
    const authHeader = request.headers.get("X-E2E-AUTH");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing X-E2E-AUTH header" },
        { status: 401 },
      );
    }

    const secret = process.env.E2E_AUTH_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "E2E_AUTH_SECRET not configured" },
        { status: 500 },
      );
    }

    const payload = JSON.stringify({ to, dimension, type });
    const expectedHmac = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    if (authHeader !== expectedHmac) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 },
      );
    }

    // Poll for the email - always use service client in E2E mode for reliable access
    const startTime = Date.now();
    const supabase = getSupabaseServiceClient();

    while (Date.now() - startTime < timeoutMs) {
      // Query for the most recent update request email for this recipient
      // Use case-insensitive email comparison
      const { data, error } = await supabase
        .from("email_outbox")
        .select("id, to_email, subject, payload, created_at")
        .ilike("to_email", to)
        .eq("template", "update-" + dimension)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows returned", which is expected
        console.error("Error querying email outbox:", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }

      if (data) {
        // Extract deep link from the email payload or resolve via token_id
        let deepLink = extractDeepLink(data.payload);

        if (!deepLink && data.payload && typeof data.payload === "object") {
          const tokenId = (data.payload as any).token_id as string | undefined;
          if (tokenId) {
            try {
              const tokenData =
                await TokenService.getTokenDataForEmail(tokenId);
              if (tokenData && tokenData.token) {
                const base = process.env.NEXT_PUBLIC_APP_URL || getBaseUrl();
                deepLink = `${base.replace(/\/$/, "")}/update?token=${encodeURIComponent(tokenData.token)}`;
              }
            } catch {
              // ignore resolution failures; fall back to null
            }
          }
        }

        return NextResponse.json({
          found: true,
          id: data.id,
          subject: data.subject,
          to: data.to_email,
          created_at: data.created_at,
          html: (data as any).payload?.html || "",
          deepLink,
        });
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    // Timeout reached, no email found
    return NextResponse.json({ found: false }, { status: 408 });
  } catch (error) {
    console.error("Error in outbox wait endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Extract deep link from email payload
 * Looks for URLs matching /update?token=... pattern
 */
function extractDeepLink(payload: any): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  // Check if there's a direct deep link in the payload
  if (payload.deepLink && typeof payload.deepLink === "string") {
    return payload.deepLink;
  }

  // Check if there's a ctaUrl in the payload
  if (payload.ctaUrl && typeof payload.ctaUrl === "string") {
    return payload.ctaUrl;
  }

  // Check HTML content for update links
  if (payload.html && typeof payload.html === "string") {
    const updateLinkMatch = payload.html.match(
      /https?:\/\/[^\s"']*\/update\?token=[^\s"']*/i,
    );
    if (updateLinkMatch) {
      return updateLinkMatch[0];
    }
  }

  // Check text content for update links
  if (payload.text && typeof payload.text === "string") {
    const updateLinkMatch = payload.text.match(
      /https?:\/\/[^\s]*\/update\?token=[^\s]*/i,
    );
    if (updateLinkMatch) {
      return updateLinkMatch[0];
    }
  }

  return null;
}
