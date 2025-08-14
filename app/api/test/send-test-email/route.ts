import { NextRequest, NextResponse } from 'next/server';
import { getEmailTransport } from '../../../lib/emails/transport';

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
    const { to, subject, html } = body;

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'to, subject, and html are required' }, { status: 400 });
    }

    console.log('[SEND-TEST-EMAIL] Sending test email...');
    console.log('[SEND-TEST-EMAIL] To:', to);
    console.log('[SEND-TEST-EMAIL] Subject:', subject);

    const transport = getEmailTransport();
    const result = await transport.send({
      to,
      subject,
      html
    });

    console.log('[SEND-TEST-EMAIL] Email send result:', result);

    return NextResponse.json({
      success: true,
      result,
      transportStats: transport.getStats()
    });
    
  } catch (error) {
    console.error('[SEND-TEST-EMAIL] Error:', error);
    return NextResponse.json({ 
      error: 'Test email failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
