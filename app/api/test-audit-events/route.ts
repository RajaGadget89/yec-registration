import { NextResponse } from 'next/server';
import { logEvent } from '../../lib/audit/auditClient';

export async function GET() {
  try {
    const requestId = 'test-events-' + Date.now();
    
    // Test event logging
    await logEvent({
      action: 'TestEvent',
      resource: 'TestResource',
      actor_role: 'system',
      result: 'success',
      correlation_id: requestId,
      meta: { test: true }
    });

    return NextResponse.json({ 
      ok: true, 
      message: 'Event log entry created',
      request_id: requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test audit events endpoint:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    const requestId = 'test-events-post-' + Date.now();
    
    // Test event logging with different action
    await logEvent({
      action: 'TestEventPost',
      resource: 'TestResourcePost',
      actor_role: 'system',
      result: 'success',
      correlation_id: requestId,
      meta: { test: true, method: 'POST' }
    });

    return NextResponse.json({ 
      ok: true, 
      message: 'POST event log entry created',
      request_id: requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test audit events POST endpoint:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function PUT() {
  try {
    const requestId = 'test-events-put-' + Date.now();
    
    // Test event logging with different action
    await logEvent({
      action: 'TestEventPut',
      resource: 'TestResourcePut',
      actor_role: 'system',
      result: 'success',
      correlation_id: requestId,
      meta: { test: true, method: 'PUT' }
    });

    return NextResponse.json({ 
      ok: true, 
      message: 'PUT event log entry created',
      request_id: requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test audit events PUT endpoint:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
