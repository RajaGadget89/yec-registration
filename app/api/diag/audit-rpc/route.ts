import { NextResponse } from 'next/server';
import { withAuditLogging } from '../../../lib/audit/withAuditAccess';
import { logEvent } from '../../../lib/audit/auditClient';
import { getRequestId } from '../../../lib/audit/requestContext';

// Ensure Node runtime
export const runtime = 'nodejs';

/**
 * Diagnostic endpoint for RPC audit testing
 * This endpoint is wrapped with withAuditLogging to ensure an access log entry is always produced
 */
async function handler(): Promise<NextResponse> {
  // Read the request-id from the AsyncLocalStorage context (or generate if missing)
  const requestId = getRequestId();
  
  // Immediately call the real audit client
  await logEvent({
    action: 'AuditRpcTest',
    resource: 'Diag',
    actor_role: 'system',
    result: 'success',
    correlation_id: requestId,
    meta: { from: 'audit-rpc' }
  });

  // Return 200 JSON response
  return NextResponse.json({ ok: true });
}

// Export the wrapped handler
export const GET = withAuditLogging(handler);
export const POST = withAuditLogging(handler);
