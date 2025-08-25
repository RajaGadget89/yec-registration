import { NextRequest, NextResponse } from "next/server";
import { validateAdminAccess } from "../../../../lib/admin-guard-server";
import { RetryEmailDispatch } from "../../../../lib/emails/commands/RetryEmailDispatch";
import { logAccess } from "../../../../lib/audit/auditClient";

/**
 * Admin API route for retrying failed emails
 * POST: Retry failed emails by re-enqueueing them
 *
 * Request body:
 * {
 *   "ids": string[],
 *   "reason"?: string
 * }
 *
 * Authentication: Admin access required
 */

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Validate admin access
    const adminCheck = validateAdminAccess(request);
    if (!adminCheck.valid) {
      console.log(
        `[email-outbox-retry] POST request unauthorized - no valid admin access`,
      );
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { ids, reason } = body;

    // Validate request body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_request",
          message: "ids array is required and must not be empty",
        },
        { status: 400 },
      );
    }

    if (ids.length > 100) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_request",
          message: "Cannot retry more than 100 emails at once",
        },
        { status: 400 },
      );
    }

    // Validate that all IDs are strings
    if (!ids.every((id) => typeof id === "string")) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_request",
          message: "All ids must be strings",
        },
        { status: 400 },
      );
    }

    // Execute retry command
    const retryCommand = new RetryEmailDispatch();
    await retryCommand.execute(ids, adminCheck.adminEmail!, reason);

    // Log access for audit
    await logAccess({
      action: "admin.email_outbox_retry",
      method: "POST",
      resource: "/api/admin/email-outbox/retry",
      result: "success",
      request_id: requestId,
      src_ip: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
      meta: {
        admin_email: adminCheck.adminEmail,
        email_ids: ids,
        reason,
        retry_count: ids.length,
      },
    });

    // Return success response
    return NextResponse.json({
      ok: true,
      message: `Successfully queued ${ids.length} emails for retry`,
      retried_count: ids.length,
    });
  } catch (error) {
    console.error("[email-outbox-retry] Error:", error);

    // Log access failure for audit
    await logAccess({
      action: "admin.email_outbox_retry",
      method: "POST",
      resource: "/api/admin/email-outbox/retry",
      result: "error",
      request_id: requestId,
      src_ip: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
      meta: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes("No emails found")) {
        return NextResponse.json(
          { ok: false, error: "not_found", message: error.message },
          { status: 404 },
        );
      }
      if (
        error.message.includes(
          "Cannot retry emails that are not in failed status",
        )
      ) {
        return NextResponse.json(
          { ok: false, error: "invalid_status", message: error.message },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: "internal_server_error",
        message: "Failed to retry emails",
      },
      { status: 500 },
    );
  }
}
