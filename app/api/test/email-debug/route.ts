import { NextRequest, NextResponse } from 'next/server';
import { hasEmailConfig, config } from '../../../lib/config';

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
    // Get transport stats
    const { getEmailTransport } = await import('../../../lib/emails/transport');
    const transport = getEmailTransport();
    const stats = transport.getStats();

    return NextResponse.json({
      stats,
      sendLog: 'getSendLog' in transport ? (transport as any).getSendLog() : [],
      environment: {
        EMAIL_MODE: process.env.EMAIL_MODE,
        EMAIL_CAP_MAX_PER_RUN: process.env.EMAIL_CAP_MAX_PER_RUN,
        BLOCK_NON_ALLOWLIST: process.env.BLOCK_NON_ALLOWLIST,
        EMAIL_ALLOWLIST: process.env.EMAIL_ALLOWLIST,
        DISPATCH_DRY_RUN: process.env.DISPATCH_DRY_RUN,
        RESEND_API_KEY: process.env.RESEND_API_KEY ? 'SET' : 'NOT_SET',
        FROM_EMAIL: process.env.FROM_EMAIL || 'NOT_SET',
        REPLY_TO_EMAIL: process.env.REPLY_TO_EMAIL || 'NOT_SET'
      },
      emailConfig: {
        hasEmailConfig: hasEmailConfig(),
        resendApiKey: config.email.resendApiKey ? 'SET' : 'NOT_SET',
        fromEmail: config.email.fromEmail || 'NOT_SET',
        replyToEmail: config.email.replyToEmail || 'NOT_SET'
      }
    });
  } catch (error) {
    console.error('Email debug error:', error);
    return NextResponse.json({ 
      error: 'Email debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
