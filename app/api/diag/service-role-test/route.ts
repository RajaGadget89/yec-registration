import { NextResponse } from "next/server";
import { getSupabaseAdminAudit } from "../../../lib/supabaseAdminAudit";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = getSupabaseAdminAudit();

    // Test 1: Try to query a simple table
    const { data: testData, error: testError } = await supabase
      .from("access_log") // Using schema-specific client
      .select("id")
      .limit(1);

    // Test 2: Try to insert a test record
    const testRequestId = `service-role-test-${Date.now()}`;
    const { data: insertData, error: insertError } = await supabase
      .from("access_log") // Using schema-specific client
      .insert({
        action: "service-role-test",
        method: "GET",
        resource: "/api/diag/service-role-test",
        result: "200",
        request_id: testRequestId,
        src_ip: "127.0.0.1",
        user_agent: "service-role-test",
        latency_ms: 50,
        meta: { test: true },
      })
      .select();

    // Test 3: Try to call the RPC function
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "log_access",
      {
        p: {
          action: "service-role-rpc-test",
          method: "GET",
          resource: "/api/diag/service-role-test",
          result: "200",
          request_id: `rpc-test-${Date.now()}`,
          src_ip: "127.0.0.1",
          user_agent: "service-role-rpc-test",
          latency_ms: 50,
          meta: { test: true },
        },
      },
    );

    return NextResponse.json({
      ok: true,
      message: "Service role test completed",
      timestamp: new Date().toISOString(),
      tests: {
        query_test: {
          success: !testError,
          error: testError?.message || null,
          data_count: testData?.length || 0,
        },
        insert_test: {
          success: !insertError,
          error: insertError?.message || null,
          data: insertData,
        },
        rpc_test: {
          success: !rpcError,
          error: rpcError?.message || null,
          data: rpcData,
        },
      },
      test_request_id: testRequestId,
    });
  } catch (error) {
    console.error("Service role test error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected error during service role test",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
