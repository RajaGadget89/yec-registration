import { NextRequest, NextResponse } from "next/server";
import { validateAdminAccess } from "../../../lib/admin-guard-server";
import { getOutboxStats } from "../../../lib/emails/dispatcher";
import { logAccess } from "../../../lib/audit/auditClient";

/**
 * Admin API route for email outbox statistics (read-only)
 * GET: Get outbox statistics for admin dashboard
 *
 * Authentication: Admin access required
 *
 * Self-check commands (dev notes):
 * curl -i http://localhost:8080/api/admin/email-outbox-stats
 * Expect 200 for an admin session; otherwise 401.
 */

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Validate admin access
    const adminCheck = validateAdminAccess(request);
    if (!adminCheck.valid) {
      console.log(
        `[email-outbox-stats] GET request unauthorized - requester: ${request.headers.get("user-agent") || "unknown"}, result: 401, reason: ${adminCheck.error}`,
      );
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    console.log(
      `[email-outbox-stats] GET request authorized - requester: ${adminCheck.adminEmail}, result: 200`,
    );

    // Get outbox statistics using core service
    const stats = await getOutboxStats();

    // Log access for audit
    await logAccess({
      action: "admin.email_outbox_stats.read",
      method: "GET",
      resource: "/api/admin/email-outbox-stats",
      result: "success",
      request_id: requestId,
      src_ip: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
      meta: {
        admin_email: adminCheck.adminEmail,
        stats: stats,
      },
    });

    // Log for observability (dev sanity checks)
    console.log(
      `[email-outbox-stats] Stats requested by ${adminCheck.adminEmail}: pending=${stats.total_pending}, sent=${stats.total_sent}, error=${stats.total_error}`,
    );

    return NextResponse.json({
      ok: true,
      stats: {
        total_pending: stats.total_pending,
        total_sent: stats.total_sent,
        total_error: stats.total_error,
        oldest_pending: stats.oldest_pending,
      },
    });
  } catch (error) {
    console.error("[email-outbox-stats] Failed to get outbox stats:", error);

    // Log access failure for audit
    await logAccess({
      action: "admin.email_outbox_stats.read",
      method: "GET",
      resource: "/api/admin/email-outbox-stats",
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
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
