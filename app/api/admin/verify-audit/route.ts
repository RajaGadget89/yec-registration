import { NextRequest, NextResponse } from 'next/server';
import { verifyAuditSystem, cleanupTestAuditEntries } from '../../../lib/audit-verification';
import { withAdminApiGuard } from '../../../lib/admin-guard-server';

export const runtime = 'nodejs';

/**
 * GET: Verify audit system functionality
 * POST: Clean up test audit entries
 */
export async function GET(request: NextRequest) {
  return withAdminApiGuard(async (_req: NextRequest) => {
    void _req; // used to satisfy lint without changing config
    try {
      const result = await verifyAuditSystem();
      
      return NextResponse.json({
        success: result.success,
        data: result
      });

    } catch (error) {
      console.error('Audit verification error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to verify audit system',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  })(request);
}

export async function POST(request: NextRequest) {
  return withAdminApiGuard(async (_req: NextRequest) => {
    void _req; // used to satisfy lint without changing config
    try {
      await cleanupTestAuditEntries();
      
      return NextResponse.json({
        success: true,
        message: 'Test audit entries cleaned up successfully'
      });

    } catch (error) {
      console.error('Audit cleanup error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to clean up test audit entries',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  })(request);
}

