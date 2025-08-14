import { NextRequest, NextResponse } from 'next/server';
import { TelegramService } from '../../../lib/telegramService';

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
    const telegramService = TelegramService.getInstance();
    const outbox = telegramService.getOutbox();
    const latestPayload = telegramService.getLatestPayload();
    
    return NextResponse.json({
      outbox,
      latestPayload,
      count: outbox.length,
      environment: {
        TEST_HELPERS_ENABLED: process.env.TEST_HELPERS_ENABLED,
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? 'SET' : 'NOT_SET',
        TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID ? 'SET' : 'NOT_SET'
      }
    });
    
  } catch (error) {
    console.error('Telegram outbox error:', error);
    return NextResponse.json({ 
      error: 'Telegram outbox failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
