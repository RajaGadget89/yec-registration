import { NextRequest, NextResponse } from 'next/server';
import { eventBus } from '../../../lib/events/eventBus';

export async function GET(request: NextRequest) {
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
    const stats = eventBus.getStats();
    
    return NextResponse.json({
      success: true,
      stats,
      environment: {
        TEST_HELPERS_ENABLED: process.env.TEST_HELPERS_ENABLED,
        AUTH_NO_EVENTS: process.env.AUTH_NO_EVENTS,
        AUTH_TRACE: process.env.AUTH_TRACE
      }
    });
    
  } catch (error) {
    console.error('Event stats error:', error);
    return NextResponse.json({ 
      error: 'Event stats failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
