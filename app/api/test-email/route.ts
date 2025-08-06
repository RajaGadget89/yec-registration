import { NextResponse } from 'next/server';
// import { sendEmail } from '@/lib/emailService';
import { sendEmail } from '../../lib/emailService';

export async function GET() {
  try {
    await sendEmail({
      to: 'sharepoints911@gmail.com',
      subject: '✅ Resend Email Test',
      html: '<h1>Test Successful</h1><p>This is a test email sent using Resend API.</p>',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Test email failed:', error);
    return NextResponse.json({ success: false, error: error }, { status: 500 });
  }
}

