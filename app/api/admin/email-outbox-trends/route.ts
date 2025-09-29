import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth-utils.server";
import { GetEmailOutboxTrends } from "../../../lib/emails/queries/GetEmailOutboxTrends";
import { EmailOutboxAlertEvaluator } from "../../../lib/emails/alerts/EmailOutboxAlertEvaluator";
import { logAccess } from "../../../lib/audit/auditClient";

export const dynamic = "force-dynamic";

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
    // Validate admin access using proper Supabase authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json(
        { ok: false, error: "Not authorized" },
        { status: 403 },
      );
    }

    // Allow both admin and super_admin users to access email outbox
    // No additional business role check needed since user.role is already validated above

    console.log(
      `[email-outbox-trends] GET request authorized - requester: ${user.email}, result: 200`,
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
        admin_email: user.email,
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
