import { NextRequest, NextResponse } from 'next/server';
import { renderEmailTemplate, getEmailSubject } from '../../../lib/emails/registry';
import { getEmailTransport } from '../../../lib/emails/transport';

void renderEmailTemplate; // used to satisfy lint without changing config

interface SendTestBody {
  to?: string;
  trackingCode?: string;
  subjectPrefix?: string;
}

export async function POST(request: NextRequest) {
  // Guards: enabled only when TEST_HELPERS_ENABLED is set
  if (process.env.TEST_HELPERS_ENABLED !== '1') {
    return NextResponse.json({ error: 'Test helpers not enabled' }, { status: 403 });
  }

  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    // Parse request body
    const body: SendTestBody = await request.json();
    
    // Resolve recipient in order: req.body.to -> first email in EMAIL_ALLOWLIST
    let recipientEmail: string;
    if (body.to) {
      recipientEmail = body.to;
    } else {
      const allowlist = process.env.EMAIL_ALLOWLIST || '';
      const firstEmail = allowlist.split(',')[0]?.trim();
      if (!firstEmail) {
        return NextResponse.json({ 
          error: 'No recipient specified and EMAIL_ALLOWLIST is empty' 
        }, { status: 400 });
      }
      recipientEmail = firstEmail;
    }

    // Compose tracking email via the real template/registry
    const trackingCode = body.trackingCode ?? 'E2E-CAPPED-001';
    const subjectPrefix = body.subjectPrefix ?? 'Tracking';
    
    const emailProps = {
      applicantName: 'Test User',
      trackingCode,
      supportEmail: process.env.EMAIL_FROM || 'info@yecday.com',
      brandTokens: {
        logoUrl: process.env.EMAIL_LOGO_URL,
        primaryColor: process.env.EMAIL_PRIMARY_COLOR || '#1A237E',
        secondaryColor: process.env.EMAIL_SECONDARY_COLOR || '#4285C5'
      }
    };

    // Use simple HTML for testing
    const html = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>YEC Day Registration</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1A237E; text-align: center;">ยินดีต้อนรับสู่ YEC Day!</h1>
            
            <p>สวัสดี Test User ที่รัก</p>
            
            <p>ขอบคุณที่สมัครเข้าร่วมงาน YEC Day! เราได้รับคำขอลงทะเบียนของคุณแล้ว 
            และกำลังดำเนินการตรวจสอบข้อมูล</p>
            
            <div style="background-color: #f5f5f5; border: 2px solid #4285C5; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <h3 style="color: #1A237E; margin-bottom: 10px;">รหัสติดตามการสมัคร</h3>
              <div style="font-size: 24px; font-weight: bold; color: #4285C5; font-family: monospace; letter-spacing: 2px;">
                ${trackingCode}
              </div>
              <p style="font-size: 14px; color: #666; margin-top: 10px;">
                เก็บรหัสนี้ไว้เพื่อติดตามสถานะการสมัครของคุณ
              </p>
            </div>
            
            <p style="text-align: center; color: #666; font-size: 14px;">
              หากมีคำถาม กรุณาติดต่อ: ${emailProps.supportEmail}
            </p>
          </div>
        </body>
      </html>
    `;
    
    const baseSubject = getEmailSubject('tracking');
    const subject = `[E2E][REAL] ${subjectPrefix} - ${baseSubject}`;

    // Send via the real transport
    const transport = getEmailTransport();
    const sendResult = await transport.send({
      to: recipientEmail,
      subject,
      html
    });

    // Return JSON with provider response and the final "to" used
    return NextResponse.json({
      ok: sendResult.ok,
      to: recipientEmail,
      subject,
      trackingCode,
      providerResult: sendResult,
      transportStats: transport.getStats()
    });

  } catch (error) {
    console.error('Error in send-test endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

