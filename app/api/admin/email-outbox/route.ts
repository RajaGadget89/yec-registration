import { NextRequest, NextResponse } from "next/server";
import { validateAdminAccess } from "../../../lib/admin-guard-server";
import { GetEmailOutboxItems } from "../../../lib/emails/queries/GetEmailOutboxItems";
import { logAccess } from "../../../lib/audit/auditClient";

/**
 * Admin API route for email outbox items (read-only)
 * GET: Get paginated list of email outbox items with filtering
 *
 * Query parameters:
 * - status: "pending" | "sent" | "failed" (optional)
 * - limit: number (optional, default: 50)
 * - offset: number (optional, default: 0)
 *
 * Authentication: Admin access required
 */

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Validate admin access
    const adminCheck = validateAdminAccess(request);
    if (!adminCheck.valid) {
      console.log(
        `[email-outbox] GET request unauthorized - no valid admin access`,
      );
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as
      | "pending"
      | "sent"
      | "failed"
      | null;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Validate parameters
    if (status && !["pending", "sent", "failed"].includes(status)) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_status",
          message: "Status must be pending, sent, or failed",
        },
        { status: 400 },
      );
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_limit",
          message: "Limit must be between 1 and 100",
        },
        { status: 400 },
      );
    }

    if (offset < 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_offset",
          message: "Offset must be non-negative",
        },
        { status: 400 },
      );
    }

    // Get outbox items from core use case
    const outboxQuery = new GetEmailOutboxItems();
    const result = await outboxQuery.execute({
      status: status || undefined,
      limit,
      offset,
    });

    // Log access for audit
    await logAccess({
      action: "admin.email_outbox_items.read",
      method: "GET",
      resource: "/api/admin/email-outbox",
      result: "success",
      request_id: requestId,
      src_ip: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
      meta: {
        admin_email: adminCheck.adminEmail,
        status,
        limit,
        offset,
        total_items: result.total,
      },
    });

    // Return success response
    return NextResponse.json({
      ok: true,
      items: result.items,
      total: result.total,
      pagination: {
        limit,
        offset,
        has_more: offset + limit < result.total,
      },
    });
  } catch (error) {
    console.error("[email-outbox] Error:", error);

    // Log access failure for audit
    await logAccess({
      action: "admin.email_outbox_items.read",
      method: "GET",
      resource: "/api/admin/email-outbox",
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
        message: "Failed to get email outbox items",
      },
      { status: 500 },
    );
  }
}
