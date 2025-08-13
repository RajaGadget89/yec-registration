import { NextRequest, NextResponse } from 'next/server';
import { logAccess, logEvent } from '../../../lib/audit/auditClient';

export async function GET(request: NextRequest) {
  try {
    const requestId = `smoke-test-${Date.now()}`;
    
    // Test logAccess
    await logAccess({
      action: 'api:GET /api/diag/audit-smoke',
      method: 'GET',
      resource: 'diag',
      result: '200',
      request_id: requestId,
      src_ip: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      latency_ms: 0,
      meta: { test: true }
    });

    // Test logEvent
    await logEvent({
      action: 'SmokeTest',
      resource: 'Test',
      actor_role: 'system',
      result: 'success',
      correlation_id: requestId,
      meta: { test: true }
    });

    return NextResponse.json({
      ok: true,
      requestId,
      message: 'Audit smoke test completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Audit smoke test failed:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
