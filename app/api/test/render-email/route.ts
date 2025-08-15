import { NextRequest, NextResponse } from 'next/server';
import { renderEmailTemplate } from '../../../lib/emails/render';

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
    const { template, props } = body;

    if (!template || !props) {
      return NextResponse.json({ error: 'template and props are required' }, { status: 400 });
    }

    console.log('[RENDER-EMAIL] Rendering template:', template);
    console.log('[RENDER-EMAIL] Props:', props);

    const html = await renderEmailTemplate(template, props);

    console.log('[RENDER-EMAIL] HTML length:', html.length);
    console.log('[RENDER-EMAIL] HTML preview:', html.substring(0, 200) + '...');

    return NextResponse.json({
      success: true,
      html,
      htmlLength: html.length,
      htmlType: typeof html
    });
    
  } catch (error) {
    console.error('[RENDER-EMAIL] Error:', error);
    return NextResponse.json({ 
      error: 'Email rendering failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
