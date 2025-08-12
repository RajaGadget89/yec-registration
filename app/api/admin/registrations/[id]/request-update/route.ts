import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '../../../../../lib/supabase-server';
import { getCurrentUserFromRequest } from '../../../../../lib/auth-utils.server';
import { isAdmin } from '../../../../../lib/admin-guard';
import { EventService } from '../../../../../lib/events/eventService';
import { withAuditLogging } from '../../../../../lib/audit/withAuditAccess';

async function handlePOST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    const user = await getCurrentUserFromRequest(request);
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { reason } = body;

    const supabase = getSupabaseServiceClient();

    // Load current registration
    const { data: registration, error: fetchError } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !registration) {
      console.error('Error fetching registration:', fetchError);
      return NextResponse.json(
        { ok: false, error: 'Registration not found' },
        { status: 404 }
      );
    }

    // Update registration status to pending (send back)
    const { error: updateError } = await supabase
      .from('registrations')
      .update({ 
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating registration:', updateError);
      return NextResponse.json(
        { ok: false, error: 'Failed to update registration' },
        { status: 500 }
      );
    }

    // Emit admin request update event for centralized side-effects
    try {
      if (!user.email) {
        throw new Error('Admin email is required');
      }
      await EventService.emitAdminRequestUpdate(registration, user.email, reason);
      console.log('Admin request update event emitted successfully');
    } catch (eventError) {
      console.error('Error emitting admin request update event:', eventError);
      return NextResponse.json(
        { ok: false, error: 'Failed to process request update' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: registration.id,
      status: 'pending',
      reason: reason || 'Update requested'
    });

  } catch (error) {
    console.error('Unexpected error in request update action:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export the wrapped handler
export const POST = withAuditLogging(handlePOST, {
  resource: 'admin/request-update'
});
