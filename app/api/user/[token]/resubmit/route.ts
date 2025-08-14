import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '../../../../lib/supabase-server';
import { withAuditLogging } from '../../../../lib/audit/withAuditAccess';

async function handlePOST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const body = await request.json();

    const supabase = getSupabaseServiceClient();

    // Get client IP and user agent for audit logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Validate token and get registration using enhanced validation
    const { data: tokenValidation, error: tokenError } = await supabase
      .rpc('validate_and_consume_deep_link_token', {
        token: token,
        reg_id: body.registration_id,
        user_email: body.user_email || null,
        ip_address: ipAddress,
        user_agent: userAgent
      });

    if (tokenError) {
      console.error('Token validation error:', tokenError);
      return NextResponse.json(
        { ok: false, error: 'Token validation failed' },
        { status: 500 }
      );
    }

    if (!tokenValidation || !tokenValidation.valid) {
      console.error('Invalid token:', tokenValidation);
      return NextResponse.json(
        { 
          ok: false, 
          error: 'Invalid or expired token',
          reason: tokenValidation?.reason || 'unknown'
        },
        { status: 401 }
      );
    }

    // Get registration details
    const { data: registration, error: fetchError } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', body.registration_id)
      .single();

    if (fetchError || !registration) {
      console.error('Error fetching registration:', fetchError);
      return NextResponse.json(
        { ok: false, error: 'Registration not found' },
        { status: 404 }
      );
    }

    // Validate registration is in update state
    if (!registration.update_reason || 
        !['waiting_for_update_payment', 'waiting_for_update_info', 'waiting_for_update_tcc'].includes(registration.status)) {
      return NextResponse.json(
        { ok: false, error: 'Registration not in update state' },
        { status: 400 }
      );
    }

    // Validate that the token dimension matches the registration update reason
    const expectedDimension = registration.update_reason === 'payment' ? 'payment' :
                             registration.update_reason === 'info' ? 'profile' :
                             registration.update_reason === 'tcc' ? 'tcc' : null;

    if (tokenValidation.dimension !== expectedDimension) {
      console.error('Token dimension mismatch:', {
        tokenDimension: tokenValidation.dimension,
        expectedDimension,
        registrationUpdateReason: registration.update_reason
      });
      return NextResponse.json(
        { ok: false, error: 'Token dimension mismatch' },
        { status: 400 }
      );
    }

    // Call domain function for user resubmission
    const { data: result, error: domainError } = await supabase
      .rpc('fn_user_resubmit', {
        reg_id: body.registration_id,
        payload: body.updates || {}
      });

    if (domainError) {
      console.error('Domain function error:', domainError);
      return NextResponse.json(
        { ok: false, error: 'Failed to process resubmission' },
        { status: 500 }
      );
    }

    if (!result || result.length === 0 || !result[0].success) {
      console.error('Resubmission failed:', result);
      return NextResponse.json(
        { ok: false, error: 'Resubmission processing failed' },
        { status: 500 }
      );
    }

    const resubmissionResult = result[0];

    return NextResponse.json({
      ok: true,
      message: 'Resubmission processed successfully',
      registration_id: body.registration_id,
      status: resubmissionResult.status,
      dimension: tokenValidation.dimension,
      token_used_at: tokenValidation.used_at
    });

  } catch (error) {
    console.error('Unexpected error in user resubmission:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleGET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get('registration_id');

    if (!registrationId) {
      return NextResponse.json(
        { ok: false, error: 'Registration ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    // Validate token without consuming it (for GET requests)
    const { data: tokenValidation, error: tokenError } = await supabase
      .rpc('validate_and_consume_deep_link_token', {
        token: token,
        reg_id: registrationId,
        user_email: null,
        ip_address: null,
        user_agent: null
      });

    if (tokenError) {
      console.error('Token validation error:', tokenError);
      return NextResponse.json(
        { ok: false, error: 'Token validation failed' },
        { status: 500 }
      );
    }

    if (!tokenValidation || !tokenValidation.valid) {
      return NextResponse.json(
        { 
          ok: false, 
          error: 'Invalid or expired token',
          reason: tokenValidation?.reason || 'unknown'
        },
        { status: 401 }
      );
    }

    // Get registration details
    const { data: registration, error: fetchError } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', registrationId)
      .single();

    if (fetchError || !registration) {
      console.error('Error fetching registration:', fetchError);
      return NextResponse.json(
        { ok: false, error: 'Registration not found' },
        { status: 404 }
      );
    }

    // Return registration details for the form
    return NextResponse.json({
      ok: true,
      registration: {
        id: registration.id,
        first_name: registration.first_name,
        last_name: registration.last_name,
        email: registration.email,
        tracking_code: registration.tracking_code,
        status: registration.status,
        update_reason: registration.update_reason,
        dimension: tokenValidation.dimension
      },
      token_info: {
        dimension: tokenValidation.dimension,
        expires_at: tokenValidation.expires_at,
        created_at: tokenValidation.created_at
      }
    });

  } catch (error) {
    console.error('Unexpected error in token validation:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAuditLogging(handlePOST, {
  resource: 'user_resubmission'
});

export const GET = withAuditLogging(handleGET, {
  resource: 'token_validation'
});
