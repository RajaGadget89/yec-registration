import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '../../../../../lib/supabase-server';
import { getCurrentUserFromRequest } from '../../../../../lib/auth-utils';
import { isAdmin } from '../../../../../lib/admin-guard';
import { sendEmail, sendTelegram, emailTemplates } from '../../../../../lib/notify';

export async function POST(
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

    // Update status to rejected
    const { error: updateError } = await supabase
      .from('registrations')
      .update({ 
        status: 'rejected',
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

    // Send email notification
    const fullName = `${registration.title} ${registration.first_name} ${registration.last_name}`;
    const { subject, html } = emailTemplates.rejected(fullName, registration.registration_id);
    
    let emailSent = false;
    try {
      emailSent = await sendEmail(registration.email, subject, html);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
    }

    // Send Telegram notification (optional)
    try {
      const telegramMessage = `❌ Registration Rejected\n\nName: ${fullName}\nEmail: ${registration.email}\nRegistration ID: ${registration.registration_id}\nRejected by: ${user.email}`;
      await sendTelegram(telegramMessage);
    } catch (telegramError) {
      console.error('Error sending Telegram notification:', telegramError);
    }

    // Try to log to admin_audit_logs (optional)
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_email: user.email,
        action: 'reject',
        registration_id: registration.registration_id,
        before: registration,
        after: { ...registration, status: 'rejected' },
      });
    } catch (auditError) {
      // Silently skip if table doesn't exist
      console.log('Admin audit logging not available:', auditError);
    }

    return NextResponse.json({
      ok: true,
      id: registration.id,
      status: 'rejected',
      emailSent
    });

  } catch (error) {
    console.error('Unexpected error in reject action:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
