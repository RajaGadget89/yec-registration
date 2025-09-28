import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '../../../lib/supabase-server';
import { getCurrentUser } from '../../../lib/auth-utils.server';
import { isCheckinSystemEnabled } from '../../../lib/features';
import { logAccess, logEvent } from '../../../lib/audit/auditClient';

/**
 * POST /api/checkin/checkin
 * Process check-in for a user to an event
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = `checkin_process_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

    const { registrationId, eventId, location, notes } = await req.json();

    // Validate input
    if (!registrationId || !eventId) {
      return NextResponse.json(
        { error: 'Missing required fields: registrationId and eventId' },
        { status: 400 }
      );
    }

    // Log access
    await logAccess({
      action: 'checkin.process',
      method: 'POST',
      resource: '/api/checkin/checkin',
      result: 'attempting',
      request_id: requestId,
      src_ip: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || undefined,
      latency_ms: Date.now() - startTime,
      meta: { 
        actor: user.email,
        registration_id: registrationId,
        event_id: eventId
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
      .eq('id', eventId)
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
      .eq('registration_id', registrationId)
      .eq('checkin_event_id', eventId)
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
        .eq('registration_id', registrationId)
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
      .eq('registration_id', registrationId)
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
      .eq('id', eventId)
      .single();

    if (!eventDetails?.is_active) {
      return NextResponse.json(
        { error: 'Event is not active' },
        { status: 403 }
      );
    }

    // Create check-in record
    const { data: checkin, error: checkinError } = await supabase
      .from('user_checkins')
      .insert({
        registration_id: registrationId,
        checkin_event_id: eventId,
        event_type_id: event.event_types.id, // Add event_type_id for improved validation
        location: location || null,
        notes: notes || null,
        checked_in_by: user.id,
        metadata: {
          checker_email: user.email,
          checkin_method: 'qr_scan',
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (checkinError) {
      console.error('Error creating check-in:', checkinError);
      console.error('Event data:', event);
      console.error('Event types:', event.event_types);
      return NextResponse.json(
        { 
          error: 'Failed to create check-in record',
          details: checkinError.message,
          event_type_id: event.event_types.id
        },
        { status: 500 }
      );
    }

    // Log successful check-in event
    await logEvent({
      correlationId: requestId,
      eventType: 'user_checkin',
      entityId: checkin.id,
      meta: {
        registration_id: registrationId,
        event_id: eventId,
        checker_email: user.email,
        user_name: `${registration.first_name} ${registration.last_name}`,
        event_name: event.name
      }
    });

    // Log successful access
    await logAccess({
      action: 'checkin.process',
      method: 'POST',
      resource: '/api/checkin/checkin',
      result: 'success',
      request_id: requestId,
      src_ip: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || undefined,
      latency_ms: Date.now() - startTime,
      meta: { 
        actor: user.email,
        registration_id: registrationId,
        event_id: eventId,
        checkin_id: checkin.id
      }
    });

    return NextResponse.json({
      success: true,
      checkin: {
        id: checkin.id,
        registration_id: registrationId,
        event_id: eventId,
        checkin_time: checkin.checkin_time,
        location: checkin.location,
        notes: checkin.notes
      },
      user: {
        full_name: `${registration.first_name} ${registration.last_name}`,
        email: registration.email,
        phone: registration.phone
      },
      event: {
        name: event.name,
        location: location || null
      }
    });

  } catch (error) {
    console.error('Error processing check-in:', error);
    
    // Log error
    await logAccess({
      action: 'checkin.process',
      method: 'POST',
      resource: '/api/checkin/checkin',
      result: 'error',
      request_id: requestId,
      src_ip: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || undefined,
      latency_ms: Date.now() - startTime,
      meta: { 
        actor: user?.email,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
