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

    // Validate token and get registration
    const { data: tokenValidation, error: tokenError } = await supabase
      .rpc('validate_deep_link_token', {
        token: token,
        reg_id: body.registration_id // We'll need to extract this from token in production
      });

    if (tokenError || !tokenValidation) {
      console.error('Token validation error:', tokenError);
      return NextResponse.json(
        { ok: false, error: 'Invalid or expired token' },
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
      return NextResponse.json(
        { ok: false, error: result?.[0]?.message || 'Failed to process resubmission' },
        { status: 400 }
      );
    }

    const resubmitResult = result[0];

    // Emit user resubmitted event for centralized side-effects
    try {
      // This would be handled by the event system
      console.log('User resubmitted event would be emitted here');
    } catch (eventError) {
      console.error('Error emitting user resubmitted event:', eventError);
      // Don't fail the request if event emission fails
    }

    return NextResponse.json({
      ok: true,
      registration_id: body.registration_id,
      status: resubmitResult.new_status,
      message: resubmitResult.message
    });

  } catch (error) {
    console.error('Unexpected error in user resubmission:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export the wrapped handler
export const POST = withAuditLogging(handlePOST, {
  resource: 'user/resubmit'
});
