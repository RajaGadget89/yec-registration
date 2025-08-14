import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '../../../lib/supabase-server';
import { EventService } from '../../../lib/events/eventService';
import { eventDrivenEmailService } from '../../../lib/emails/enhancedEmailService';

/**
 * Test-only helper endpoint to request update for a registration
 * Guarded with NODE_ENV === 'test' || TEST_HELPERS_ENABLED === '1' and CRON_SECRET
 * Bypasses admin authentication for testing purposes
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
    const { registrationId, dimension, notes } = body;

    // Validate required fields
    if (!registrationId) {
      return NextResponse.json({ error: 'registrationId is required' }, { status: 400 });
    }

    if (!dimension || !['payment', 'profile', 'tcc'].includes(dimension)) {
      return NextResponse.json({ error: 'Invalid dimension. Must be payment, profile, or tcc' }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();

    // Load current registration
    const { data: registration, error: fetchError } = await supabase
      .from('registrations')
      .select('*')
      .eq('registration_id', registrationId)
      .single();

    if (fetchError || !registration) {
      console.error('Error fetching registration:', fetchError);
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    // Call domain function for request update
    const { data: result, error: domainError } = await supabase
      .rpc('fn_request_update', {
        reg_id: registrationId,
        dimension: dimension,
        notes: notes || null
      });

    if (domainError) {
      console.error('Domain function error:', domainError);
      return NextResponse.json({ error: 'Failed to request update' }, { status: 500 });
    }

    if (!result || result.length === 0 || !result[0].success) {
      console.error('Request update failed:', result);
      return NextResponse.json({ error: 'Request update processing failed' }, { status: 500 });
    }

    const updateResult = result[0];

    // Send email notification using enhanced email service
    try {
      const brandTokens = eventDrivenEmailService.getBrandTokens();
      const emailResult = await eventDrivenEmailService.processEvent(
        'review.request_update',
        registration,
        'test-admin@example.com', // Use test admin email
        dimension,
        notes,
        undefined, // no badge URL for update requests
        undefined, // no rejection reason for update requests
        brandTokens
      );

      if (emailResult) {
        console.log('Update request email sent successfully:', {
          to: emailResult.to,
          template: emailResult.template,
          ctaUrl: emailResult.ctaUrl
        });
      }
    } catch (emailError) {
      console.error('Error sending update request email:', emailError);
      // Don't fail the request if email fails
    }

    // Emit admin request update event for centralized side-effects
    try {
      await EventService.emitAdminRequestUpdate(registration, 'test-admin@example.com', dimension, notes);
      console.log('Admin request update event emitted successfully');
    } catch (eventError) {
      console.error('Error emitting admin request update event:', eventError);
      // Don't fail the request if event emission fails
    }

    return NextResponse.json({
      ok: true,
      registrationId: registration.registration_id,
      status: updateResult.status,
      dimension: dimension,
      notes: notes,
      message: `Update requested for ${dimension} dimension`
    });

  } catch (error) {
    console.error('Error in test request-update endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
