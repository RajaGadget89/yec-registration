import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '../../../../lib/supabase-server';
import { getCurrentUser } from '../../../../lib/auth-utils.server';
import { isCheckinSystemEnabled } from '../../../../lib/features';
import { logAccess } from '../../../../lib/audit/auditClient';

/**
 * POST /api/checkin/validate-qr
 * Validate QR code data and extract user information
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = `validate_qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Check feature flag
    if (!isCheckinSystemEnabled()) {
      return NextResponse.json(
        { error: 'Feature not available' },
        { status: 404 }
      );
    }

    // Check authentication
    const user = await getCurrentUser();
    if (!user || !user.is_active) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check authorization (admin, super_admin, or checker_admin)
    if (!['admin', 'super_admin', 'checker_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { qr_data } = await req.json();

    // Validate input
    if (!qr_data) {
      return NextResponse.json(
        { error: 'Missing required field: qr_data' },
        { status: 400 }
      );
    }

    // Log access
    await logAccess({
      action: 'checkin.qr.validate',
      method: 'POST',
      resource: '/api/checkin/validate-qr',
      result: 'attempting',
      request_id: requestId,
      src_ip: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || undefined,
      latency_ms: Date.now() - startTime,
      meta: { 
        actor: user.email
      }
    });

    // Parse QR code data
    let parsedData;
    try {
      parsedData = JSON.parse(qr_data);
    } catch (error) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Invalid QR code format' 
        },
        { status: 400 }
      );
    }

    // Validate QR code structure
    if (!parsedData.regId || !parsedData.fullName || !parsedData.phone) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Invalid QR code data structure' 
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    // Get user information from database
    const { data: registration, error } = await supabase
      .from('registrations')
      .select(`
        registration_id,
        first_name,
        last_name,
        email,
        phone,
        status,
        yec_province
      `)
      .eq('registration_id', parsedData.regId)
      .single();

    if (error || !registration) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Registration not found' 
        },
        { status: 404 }
      );
    }

    if (registration.status !== 'approved') {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Registration not approved',
          registration_status: registration.status
        },
        { status: 403 }
      );
    }

    // Log successful access
    await logAccess({
      action: 'checkin.qr.validate',
      method: 'POST',
      resource: '/api/checkin/validate-qr',
      result: 'success',
      request_id: requestId,
      src_ip: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || undefined,
      latency_ms: Date.now() - startTime,
      meta: { 
        actor: user.email,
        registration_id: parsedData.regId
      }
    });

    return NextResponse.json({
      valid: true,
      registration_id: registration.registration_id,
      user_info: {
        full_name: `${registration.first_name} ${registration.last_name}`,
        email: registration.email,
        phone: registration.phone,
        yec_province: registration.yec_province,
      },
      badge_info: {
        registration_status: registration.status,
      },
    });
  } catch (error) {
    console.error('Error validating QR code:', error);

    // Log error
    await logAccess({
      action: 'checkin.qr.validate',
      method: 'POST',
      resource: '/api/checkin/validate-qr',
      result: 'error',
      request_id: requestId,
      src_ip: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || undefined,
      latency_ms: Date.now() - startTime,
      meta: {
        error: error instanceof Error ? error.message : 'Unknown error',
        actor: 'unknown'
      }
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


