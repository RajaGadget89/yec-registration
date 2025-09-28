import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '../../../../lib/supabase-server';
import { getCurrentUser } from '../../../../lib/auth-utils.server';
import { isCheckinSystemEnabled } from '../../../../lib/features';
import { logAccess, logEvent } from '../../../../lib/audit/auditClient';

/**
 * POST /api/checkin/scan
 * Process QR code scan and check-in user
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = `checkin_scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

    const { registration_id, checkin_event_id, location, notes } = await req.json();

    // Validate input
    if (!registration_id || !checkin_event_id) {
      return NextResponse.json(
        { error: 'Missing required fields: registration_id and checkin_event_id' },
        { status: 400 }
      );
    }

    // Log access
    await logAccess({
      action: 'checkin.scan.process',
      method: 'POST',
      resource: '/api/checkin/scan',
      result: 'attempting',
      request_id: requestId,
      src_ip: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || undefined,
      latency_ms: Date.now() - startTime,
      meta: { 
        actor: user.email,
        registration_id,
        checkin_event_id
      }
    });

    const supabase = getSupabaseServiceClient();

    // First, get the event information to check the event type
    const { data: event, error: eventError } = await supabase
      .from('checkin_events')
      .select(`
        id,
        name,
        event_types!inner(
          id,
          name,
          description,
          business_rule_category
        )
      `)
      .eq('id', checkin_event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const eventTypeName = event.event_types?.name;
    console.log('🔍 Event type:', eventTypeName);

    // Check if user has already checked in to this specific event
    const { data: existingCheckin } = await supabase
      .from('user_checkins')
      .select('id, checkin_time')
      .eq('registration_id', registration_id)
      .eq('checkin_event_id', checkin_event_id)
      .single();

    if (existingCheckin) {
      return NextResponse.json(
        { 
          error: 'User has already checked in to this event',
          checkin_time: existingCheckin.checkin_time
        },
        { status: 409 }
      );
    }

    // Business Rule: Check based on business rule category instead of event type name
    if (event.event_types.business_rule_category === 'ONE_TIME_ONLY') {
      console.log('🔍 Checking for any previous "ONE_TIME_ONLY" check-ins');
      
      // NEW IMPROVED METHOD: Direct query using event_type_id
      const { data: previousCheckins, error: checkinsError } = await supabase
        .from('user_checkins')
        .select('id, checkin_time, location, notes')
        .eq('registration_id', registration_id)
        .eq('event_type_id', event.event_types.id); // Direct relationship

      if (!checkinsError && previousCheckins && previousCheckins.length > 0) {
        console.log('🔍 Found previous check-in to event type:', previousCheckins[0]);
        return NextResponse.json(
          { 
            error: 'User has already completed this type of check-in. Each user can only complete this type once.',
            checkin_time: previousCheckins[0].checkin_time,
            business_rule: 'ONE_TIME_ONLY events are restricted to one check-in per user'
          },
          { status: 409 }
        );
      }
    }

    // Get user information
    const { data: registration } = await supabase
      .from('registrations')
      .select('first_name, last_name, email, phone, status')
      .eq('registration_id', registration_id)
      .single();

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    if (registration.status !== 'approved') {
      return NextResponse.json(
        { error: 'Registration not approved' },
        { status: 403 }
      );
    }

    // Check if event is active (we need to fetch this separately since our event query doesn't include is_active)
    const { data: eventDetails } = await supabase
      .from('checkin_events')
      .select('is_active')
      .eq('id', checkin_event_id)
      .single();

    if (!eventDetails?.is_active) {
      return NextResponse.json(
        { error: 'Event is not active' },
        { status: 403 }
      );
    }

    // Create check-in record
    const { data: checkin, error } = await supabase
      .from('user_checkins')
      .insert({
        registration_id,
        checkin_event_id,
        event_type_id: event.event_types.id, // Add event_type_id for improved validation
        checked_in_by: user.id,
        location: location || null,
        notes,
        metadata: {
          user_agent: req.headers.get('user-agent'),
          ip_address: req.headers.get('x-forwarded-for'),
          checked_by_role: user.role
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating check-in:', error);
      console.error('Event data:', event);
      console.error('Event types:', event.event_types);
      return NextResponse.json(
        { 
          error: 'Failed to create check-in record',
          details: error.message,
          event_type_id: event.event_types.id
        },
        { status: 500 }
      );
    }

    // Log successful event
    await logEvent({
      action: 'checkin.user.checked_in',
      resource: 'user_checkins',
      resource_id: checkin.id,
      actor_id: user.email,
      actor_role: user.role,
      result: 'success',
      correlation_id: requestId,
      meta: {
        registration_id,
        checkin_event_id,
        user_name: `${registration.first_name} ${registration.last_name}`,
        user_email: registration.email,
        event_name: event.name,
        location: location || event.location,
        checked_by: user.email
      }
    });

    // Log successful access
    await logAccess({
      action: 'checkin.scan.process',
      method: 'POST',
      resource: '/api/checkin/scan',
      result: 'success',
      request_id: requestId,
      src_ip: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || undefined,
      latency_ms: Date.now() - startTime,
      meta: { 
        actor: user.email,
        registration_id,
        checkin_event_id,
        checkin_id: checkin.id
      }
    });

    return NextResponse.json({
      success: true,
      checkin_id: checkin.id,
      user_info: {
        registration_id,
        full_name: `${registration.first_name} ${registration.last_name}`,
        email: registration.email,
        phone: registration.phone,
      },
      event_info: {
        name: event.name,
        location: location || event.location,
      },
      checkin_time: checkin.checkin_time,
    });
  } catch (error) {
    console.error('Error processing check-in:', error);

    // Log error
    await logAccess({
      action: 'checkin.scan.process',
      method: 'POST',
      resource: '/api/checkin/scan',
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


