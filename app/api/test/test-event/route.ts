import { NextRequest, NextResponse } from 'next/server';
import { EventService } from '../../../lib/events/eventService';

export async function POST(request: NextRequest) {
  // Security check - only allow in test environment
  const testHelpersEnabled = request.headers.get('X-Test-Helpers-Enabled');
  const authHeader = request.headers.get('Authorization');
  
  if (testHelpersEnabled !== '1' || !authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Test helpers not enabled or unauthorized' }, { status: 403 });
  }

  const token = authHeader.replace('Bearer ', '');
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { registration } = body;

    if (!registration) {
      return NextResponse.json({ error: 'registration is required' }, { status: 400 });
    }

    console.log('[TEST-EVENT] Emitting test registration.submitted event...');
    
    const results = await EventService.emitRegistrationSubmitted(
      registration,
      undefined,
      undefined,
      'test-event'
    );

    console.log('[TEST-EVENT] Event emission results:', results);
    
    return NextResponse.json({
      success: true,
      results,
      eventType: 'registration.submitted'
    });
    
  } catch (error) {
    console.error('Test event error:', error);
    return NextResponse.json({ 
      error: 'Test event failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
