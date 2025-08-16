import { NextResponse } from "next/server";
import { logAccess } from "../../lib/audit/auditClient";

export async function GET() {
  try {
    // Test access logging
    await logAccess({
      action: "GET /api/test-audit",
      method: "GET",
      resource: "/api/test-audit",
      result: "200",
      request_id: "test-audit-" + Date.now(),
      src_ip: "127.0.0.1",
      user_agent: "Test-Agent/1.0",
      latency_ms: 50,
    });

    return NextResponse.json({
      ok: true,
      message: "Access log entry created",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in test audit endpoint:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    // Test event logging
    await logAccess({
      action: "POST /api/test-audit",
      method: "POST",
      resource: "/api/test-audit",
      result: "200",
      request_id: "test-audit-post-" + Date.now(),
      src_ip: "127.0.0.1",
      user_agent: "Test-Agent/1.0",
      latency_ms: 75,
    });

    return NextResponse.json({
      ok: true,
      message: "POST access log entry created",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in test audit POST endpoint:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
