import { NextResponse } from 'next/server';
import { withAuditLogging } from '../../lib/audit/withAuditAccess';
import { getRequestId } from '../../lib/audit/requestContext';

async function handler(): Promise<NextResponse> {
  const requestId = getRequestId();
  
  return NextResponse.json({
    success: true,
    message: 'Test endpoint with audit wrapper',
    request_id: requestId,
    timestamp: new Date().toISOString()
  });
}

// Export the wrapped handler
export const GET = withAuditLogging(handler);
export const POST = withAuditLogging(handler);

