import { NextRequest, NextResponse } from 'next/server';
import { verifyStorageBuckets, createMissingBuckets, REQUIRED_BUCKETS } from '../../../lib/storage-bucket-setup';
import { isAdmin } from '../../../lib/admin-guard';
import { withAuditLogging } from '../../../lib/audit/withAuditAccess';

export const runtime = 'nodejs';

/**
 * GET: Verify storage bucket status
 * POST: Create missing storage buckets
 */
export async function GET(request: NextRequest) {
  return withAuditLogging(async (req: NextRequest) => {
    try {
      // Check admin authentication
      const adminEmail = req.cookies.get('admin-email')?.value;
      if (!adminEmail || !isAdmin(adminEmail)) {
        return NextResponse.json(
          { error: 'Unauthorized. Admin access required.' },
          { status: 401 }
        );
      }

      const bucketStatus = await verifyStorageBuckets();
      
      return NextResponse.json({
        success: true,
        data: {
          allBucketsExist: bucketStatus.exists,
          requiredBuckets: REQUIRED_BUCKETS.map(b => ({
            name: b.name,
            public: b.public,
            description: b.description,
            maxFileSize: b.maxFileSize,
            allowedMimeTypes: b.allowedMimeTypes
          })),
          missingBuckets: bucketStatus.missing,
          errors: bucketStatus.errors
        }
      });

    } catch (error) {
      console.error('Storage bucket verification error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to verify storage buckets',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  })(request);
}

export async function POST(request: NextRequest) {
  return withAuditLogging(async (req: NextRequest) => {
    try {
      // Check admin authentication
      const adminEmail = req.cookies.get('admin-email')?.value;
      if (!adminEmail || !isAdmin(adminEmail)) {
        return NextResponse.json(
          { error: 'Unauthorized. Admin access required.' },
          { status: 401 }
        );
      }

      const result = await createMissingBuckets();
      
      return NextResponse.json({
        success: result.success,
        data: {
          created: result.created,
          failed: result.failed,
          message: result.success 
            ? 'All required storage buckets created successfully'
            : `Some buckets failed to create: ${result.failed.join(', ')}`
        }
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

