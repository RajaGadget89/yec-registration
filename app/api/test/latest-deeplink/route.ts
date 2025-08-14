import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Test-only helper endpoint to fetch the most recent deep-link token
 * Guarded with NODE_ENV === 'test' || TEST_HELPERS_ENABLED === '1' and CRON_SECRET
 * Returns { token, dimension } for the most recent review.request_update
 */
export async function GET(request: NextRequest) {
  // Security guard: Only allow in test environment
  const isTestEnv = process.env.NODE_ENV === 'test' || 
                   process.env.TEST_HELPERS_ENABLED === '1' ||
                   request.headers.get('X-Test-Helpers-Enabled') === '1';
  if (!isTestEnv) {
    return NextResponse.json({ error: 'Test helpers not enabled' }, { status: 403 });
  }

  // CRON_SECRET authentication
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
  }

  const token = authHeader.substring(7);
  if (token !== cronSecret) {
    return NextResponse.json({ error: 'Invalid CRON_SECRET' }, { status: 401 });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query the most recent review.request_update event
    const { data: events, error: eventsError } = await supabase
      .from('audit_events')
      .select('event_data, created_at')
      .eq('event_type', 'review.request_update')
      .order('created_at', { ascending: false })
      .limit(1);

    if (eventsError) {
      console.error('Error fetching audit events:', eventsError);
      return NextResponse.json({ error: 'Failed to fetch audit events' }, { status: 500 });
    }

    if (!events || events.length === 0) {
      return NextResponse.json({ error: 'No request_update events found' }, { status: 404 });
    }

    const latestEvent = events[0];
    const eventData = latestEvent.event_data;

    // Extract token and dimension from event data
    if (!eventData || !eventData.token || !eventData.dimension) {
      return NextResponse.json({ error: 'Invalid event data structure' }, { status: 500 });
    }

    return NextResponse.json({
      token: eventData.token,
      dimension: eventData.dimension,
      created_at: latestEvent.created_at,
      registration_id: eventData.registration_id
    });

  } catch (error) {
    console.error('Error in latest-deeplink endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
