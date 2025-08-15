import { NextRequest, NextResponse } from 'next/server';
import { sendTrackingEmail } from '../../../lib/emails/enhancedEmailService';

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
    const { trackingCode, email } = body;

    if (!trackingCode || !email) {
      return NextResponse.json({ error: 'trackingCode and email are required' }, { status: 400 });
    }

    console.log('[SEND-TRACKING-EMAIL] Sending tracking email...');
    console.log('[SEND-TRACKING-EMAIL] To:', email);
    console.log('[SEND-TRACKING-EMAIL] Tracking Code:', trackingCode);

    // Create a mock registration object
    const mockRegistration = {
      id: 'test-id',
      registration_id: trackingCode,
      first_name: 'Test',
      last_name: 'User',
      email: email,
      status: 'waiting_for_review',
      created_at: new Date().toISOString()
    } as any;

    const result = await sendTrackingEmail(mockRegistration);

    console.log('[SEND-TRACKING-EMAIL] Email send result:', result);

    return NextResponse.json({
      success: true,
      result
    });
    
  } catch (error) {
    console.error('[SEND-TRACKING-EMAIL] Error:', error);
    return NextResponse.json({ 
      error: 'Tracking email failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
