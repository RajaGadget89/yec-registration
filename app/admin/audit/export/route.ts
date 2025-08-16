import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth-utils.server";
import {
  getAuditAccessLogs,
  getAuditEventLogs,
  type AuditFilters,
} from "../../../lib/supabaseAdminAudit";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

// Force Node runtime for server-side operations
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const user = await getCurrentUser();
    if (!user || !user.is_active) {
      console.error("Export: Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'access' or 'event'
    const request_id = searchParams.get("request_id");
    const correlation_id = searchParams.get("correlation_id");
    const action = searchParams.get("action");
    const resource = searchParams.get("resource");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");

    console.log("Export: Request params:", {
      type,
      request_id,
      action,
      resource,
      date_from,
      date_to,
    });

    if (!type || !["access", "event"].includes(type)) {
      console.error("Export: Invalid type parameter:", type);
      return NextResponse.json(
        { error: "Invalid type parameter" },
        { status: 400 },
      );
    }

    // Build filters from URL params
    const filters: AuditFilters = {
      request_id: request_id || undefined,
      correlation_id: correlation_id || undefined,
      action: action || undefined,
      resource: resource || undefined,
      date_from: date_from || undefined,
      date_to: date_to || undefined,
    };

    // If request_id is provided, map it to correlation_id for event logs
    if (request_id && !correlation_id && type === "event") {
      filters.correlation_id = request_id;
    }

    // Set default time window to last 24h if no dates provided
    if (!filters.date_from && !filters.date_to) {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      filters.date_from = yesterday.toISOString();
      filters.date_to = now.toISOString();
    }

    console.log("Export: Using filters:", filters);

    let csvContent = "";
    let filename = "";
    let headers: string[] = [];

    if (type === "access") {
      console.log("Export: Fetching access logs...");
      const logs = await getAuditAccessLogs(filters, 100);
      console.log("Export: Retrieved access logs count:", logs.length);

      // CSV headers for access logs
      headers = [
        "occurred_at_th",
        "action",
        "resource",
        "result",
        "request_id",
        "latency_ms",
        "src_ip",
        "user_agent",
      ];
      csvContent = headers.join(",") + "\n";

      // Add data rows
      for (const log of logs) {
        try {
          const thTime = toZonedTime(
            new Date(log.occurred_at_utc),
            "Asia/Bangkok",
          );
          const thTimeStr = format(thTime, "yyyy-MM-dd HH:mm:ss");

          const row = [
            `"${thTimeStr}"`,
            `"${log.action.replace(/"/g, '""')}"`,
            `"${(log.resource || "").replace(/"/g, '""')}"`,
            `"${log.result}"`,
            `"${log.request_id}"`,
            log.latency_ms ? log.latency_ms.toString() : "",
            `"${(log.src_ip || "").replace(/"/g, '""')}"`,
            `"${(log.user_agent || "").replace(/"/g, '""')}"`,
          ];
          csvContent += row.join(",") + "\n";
        } catch (rowError) {
          console.error(
            "Export: Error processing access log row:",
            rowError,
            log,
          );
          // Continue with other rows
        }
      }

      filename = `audit-access-logs-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    } else {
      console.log("Export: Fetching event logs...");
      const logs = await getAuditEventLogs(filters, 100);
      console.log("Export: Retrieved event logs count:", logs.length);

      // CSV headers for event logs
      headers = [
        "occurred_at_th",
        "action",
        "resource",
        "result",
        "correlation_id",
      ];
      csvContent = headers.join(",") + "\n";

      // Add data rows
      for (const log of logs) {
        try {
          const thTime = toZonedTime(
            new Date(log.occurred_at_utc),
            "Asia/Bangkok",
          );
          const thTimeStr = format(thTime, "yyyy-MM-dd HH:mm:ss");

          const row = [
            `"${thTimeStr}"`,
            `"${log.action.replace(/"/g, '""')}"`,
            `"${log.resource.replace(/"/g, '""')}"`,
            `"${log.result}"`,
            `"${log.correlation_id}"`,
          ];
          csvContent += row.join(",") + "\n";
        } catch (rowError) {
          console.error(
            "Export: Error processing event log row:",
            rowError,
            log,
          );
          // Continue with other rows
        }
      }

      filename = `audit-event-logs-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    }

    // If no data found, return a CSV with just headers
    if (csvContent === headers.join(",") + "\n") {
      csvContent += '"No data found for the specified filters"\n';
    }

    console.log("Export: Generated CSV content length:", csvContent.length);
    console.log("Export: Filename:", filename);

    // Return CSV response
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export: Unexpected error generating CSV export:", error);
    return NextResponse.json(
      {
        error: "Failed to generate CSV export",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
