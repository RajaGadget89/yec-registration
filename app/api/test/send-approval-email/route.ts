import { NextRequest, NextResponse } from 'next/server';
import { eventDrivenEmailService } from '../../../lib/emails/enhancedEmailService';

/**
 * Test-only helper endpoint to send approval emails directly
 * Guarded with NODE_ENV === 'test' || TEST_HELPERS_ENABLED === '1' and CRON_SECRET
 */
export async function POST(request: NextRequest) {
  // Security guard: Only allow in test environment
  const isTestEnv = process.env.NODE_ENV === 'test' || 
                   process.env.TEST_HELPERS_ENABLED === '1' ||
                   request.headers.get('X-Test-Helpers-Enabled') === '1';
  if (!isTestEnv) {
    return NextResponse.json({ error: 'Test helpers not enabled' }, { status: 403 });
  }

  // CRON_SECRET authentication
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
  }

  const token = authHeader.substring(7);
  if (token !== cronSecret) {
    return NextResponse.json({ error: 'Invalid CRON_SECRET' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { registration, badgeUrl } = body;

    // Validate required fields
    if (!registration) {
      return NextResponse.json({ error: 'registration is required' }, { status: 400 });
    }

    // Send approval email using enhanced email service
    const brandTokens = eventDrivenEmailService.getBrandTokens();
    const emailResult = await eventDrivenEmailService.processEvent(
      'review.approved',
      registration,
      'test-admin@example.com', // Use test admin email
      undefined, // no dimension for approvals
      undefined, // no notes for approvals
      badgeUrl, // badge URL for approvals
      undefined, // no rejection reason for approvals
      brandTokens
    );

    if (emailResult) {
      console.log('Approval email sent successfully:', {
        to: emailResult.to,
        template: emailResult.template,
        badgeUrl: badgeUrl
      });

      return NextResponse.json({
        ok: true,
        emailSent: true,
        to: emailResult.to,
        template: emailResult.template,
        trackingCode: emailResult.trackingCode
      });
    } else {
      return NextResponse.json({
        ok: false,
        emailSent: false,
        error: 'Email service returned null result'
      });
    }

  } catch (error) {
    console.error('Error in test send-approval-email endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
