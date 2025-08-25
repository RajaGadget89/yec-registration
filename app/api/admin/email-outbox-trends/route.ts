import { NextRequest, NextResponse } from "next/server";
import { validateAdminAccess } from "../../../lib/admin-guard-server";
import { GetEmailOutboxTrends } from "../../../lib/emails/queries/GetEmailOutboxTrends";
import { EmailOutboxAlertEvaluator } from "../../../lib/emails/alerts/EmailOutboxAlertEvaluator";
import { logAccess } from "../../../lib/audit/auditClient";

/**
 * Admin API route for email outbox trends and alerts (read-only)
 * GET: Get 24-hour trends data and alert status for admin dashboard
 *
 * Authentication: Admin access required
 *
 * Self-check commands (dev notes):
 * curl -i http://localhost:8080/api/admin/email-outbox-trends
 * Expect 200 for an admin session; otherwise 401.
 */

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Validate admin access
    const adminCheck = validateAdminAccess(request);
    if (!adminCheck.valid) {
      console.log(
        `[email-outbox-trends] GET request unauthorized - requester: ${request.headers.get("user-agent") || "unknown"}, result: 401, reason: ${adminCheck.error}`,
      );
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    console.log(
      `[email-outbox-trends] GET request authorized - requester: ${adminCheck.adminEmail}, result: 200`,
    );

    // Get trends data from core use case
    const trendsQuery = new GetEmailOutboxTrends();
    const trends = await trendsQuery.execute();

    // Evaluate alerts using core alert evaluator
    const alertEvaluator = new EmailOutboxAlertEvaluator();
    const alert = alertEvaluator.evaluate(trends);

    // Log access for audit
    await logAccess({
      action: "admin.email_outbox_trends.read",
      method: "GET",
      resource: "/api/admin/email-outbox-trends",
      result: "success",
      request_id: requestId,
      src_ip: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
      meta: {
        admin_email: adminCheck.adminEmail,
        trends_summary: trends.summary,
        alert_status: alert.ok,
        alert_reasons: alert.reasons,
      },
    });

    // Return success response
    return NextResponse.json({
      ok: true,
      window: "24h",
      trends,
      alert,
    });
  } catch (error) {
    console.error("[email-outbox-trends] Error:", error);

    // Log access failure for audit
    await logAccess({
      action: "admin.email_outbox_trends.read",
      method: "GET",
      resource: "/api/admin/email-outbox-trends",
      result: "error",
      request_id: requestId,
      src_ip: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
      meta: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return NextResponse.json(
      {
        ok: false,
        error: "internal_server_error",
        message: "Failed to get email outbox trends",
      },
      { status: 500 },
    );
  }
}
