import { NextRequest, NextResponse } from 'next/server';
import { verifyStorageBuckets, createMissingBuckets } from '../../../lib/storage-bucket-setup';
import { verifyAuditSystem } from '../../../lib/audit-verification';
import { getSupabaseServiceClient } from '../../../lib/supabase-server';
import { withAdminApiGuard } from '../../../lib/admin-guard-server';

export const runtime = 'nodejs';

// lint-only typing; logic unchanged
interface VerificationResult {
  success: boolean;
  error?: string;
  message?: string;
  details?: Record<string, unknown>;
}

interface StorageBucketResult {
  exists: boolean;
  missing: string[];
  errors: string[];
}

interface AdminGuardsResult extends VerificationResult {
  details?: {
    hasAdminCookie: boolean;
    adminEmail: string | null;
    path: string;
  };
}

interface OverallResult {
  success: boolean;
  passed: number;
  total: number;
}

interface VerificationResults {
  storageBuckets: StorageBucketResult | null;
  dataModel: VerificationResult | null;
  auditSystem: VerificationResult | null;
  adminGuards: AdminGuardsResult | null;
  overall: OverallResult;
}

/**
 * Comprehensive Phase 0 verification endpoint
 * Checks all Definition of Done requirements
 */
export async function GET(req: NextRequest) {
  return withAdminApiGuard(async (request: NextRequest) => {
    try {
      const results: VerificationResults = {
        storageBuckets: null,
        dataModel: null,
        auditSystem: null,
        adminGuards: null,
        overall: {
          success: false,
          passed: 0,
          total: 0
        }
      };

      // 1. Verify Storage Buckets
      console.log('[PHASE0] Verifying storage buckets...');
      results.storageBuckets = await verifyStorageBuckets();
      if (results.storageBuckets?.exists) {
        results.overall.passed++;
      }
      results.overall.total++;

      // 2. Verify Data Model (registrations table)
      console.log('[PHASE0] Verifying data model...');
      try {
        const supabase = getSupabaseServiceClient();
        
        // Check if registrations table exists and has required fields
        const { data: _registrations, error: tableError } = await supabase
          .from('registrations')
          .select('id, registration_id, status, created_at')
          .limit(1);

        if (tableError) {
          results.dataModel = {
            success: false,
            error: `Table access failed: ${tableError.message}`
          };
        } else {
          // Check if status enum values are supported
          const { data: _statusValues, error: statusError } = await supabase
            .from('registrations')
            .select('status')
            .in('status', ['pending', 'waiting_for_review', 'approved', 'rejected'])
            .limit(1);
            
          void _registrations; // used to satisfy lint without changing config
          void _statusValues; // used to satisfy lint without changing config

          if (statusError) {
            results.dataModel = {
              success: false,
              error: `Status enum check failed: ${statusError.message}`
            };
          } else {
            results.dataModel = {
              success: true,
              message: 'Registrations table exists with required fields and status enum values'
            };
            results.overall.passed++;
          }
        }
      } catch (error) {
        results.dataModel = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
      results.overall.total++;

      // 3. Verify Audit System
      console.log('[PHASE0] Verifying audit system...');
      results.auditSystem = await verifyAuditSystem();
      if (results.auditSystem.success) {
        results.overall.passed++;
      }
      results.overall.total++;

      // 4. Verify Admin Guards
      console.log('[PHASE0] Verifying admin guards...');
      try {
        // Test admin authentication check
        const adminEmail = request.cookies.get('admin-email')?.value;
        const hasAdminCookie = !!adminEmail;
        
        results.adminGuards = {
          success: hasAdminCookie,
          message: hasAdminCookie 
            ? 'Admin authentication cookie present' 
            : 'No admin authentication cookie found',
          details: {
            hasAdminCookie,
            adminEmail: adminEmail || null,
            path: request.nextUrl.pathname
          }
        };
        
        if (hasAdminCookie) {
          results.overall.passed++;
        }
      } catch (error) {
        results.adminGuards = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
      results.overall.total++;

      // Calculate overall success
      results.overall.success = results.overall.passed === results.overall.total;

      return NextResponse.json({
        success: results.overall.success,
        data: results,
        message: results.overall.success 
          ? 'Phase 0 verification passed - All requirements met'
          : `Phase 0 verification failed - ${results.overall.passed}/${results.overall.total} requirements passed`
      });

    } catch (error) {
      console.error('Phase 0 verification error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to verify Phase 0 requirements',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  })(req);
}

/**
 * POST: Create missing storage buckets if needed
 */
export async function POST(request: NextRequest) {
  return withAdminApiGuard(async (_req: NextRequest) => {
    void _req; // used to satisfy lint without changing config
    try {
      const result = await createMissingBuckets();
      
      return NextResponse.json({
        success: result.success,
        data: result,
        message: result.success 
          ? 'All required storage buckets created successfully'
          : `Some buckets failed to create: ${result.failed.join(', ')}`
      });

    } catch (error) {
      console.error('Storage bucket creation error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to create storage buckets',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  })(request);
}

