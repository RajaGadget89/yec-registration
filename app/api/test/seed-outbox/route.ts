import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '../../../lib/supabase-server';

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
    const { emails } = body;

    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json({ error: 'emails array is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const createdIds: string[] = [];

    console.log(`[SEED] Seeding ${emails.length} test emails into outbox`);

    for (const email of emails) {
      try {
        // Insert into email_outbox table
        const { data, error } = await supabase
          .from('email_outbox')
          .insert({
            template: email.template,
            to_email: email.to_email,
            payload: email.payload,
            status: 'pending',
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

              if (error) {
        console.error(`[SEED] Failed to seed email to ${email.to_email}:`, error);
        console.error(`[SEED] Email data:`, {
          template: email.template,
          to_email: email.to_email,
          payload: email.payload
        });
        continue;
      }

        createdIds.push(data.id);
        console.log(`[SEED] Created email ${data.id} to ${email.to_email}`);
      } catch (error) {
        console.error(`[SEED] Error seeding email to ${email.to_email}:`, error);
      }
    }

    console.log(`[SEED] Successfully seeded ${createdIds.length}/${emails.length} emails`);
    
    return NextResponse.json({
      success: true,
      seeded: createdIds.length,
      total: emails.length,
      ids: createdIds
    });
    
  } catch (error) {
    console.error('Seed outbox error:', error);
    return NextResponse.json({ 
      error: 'Seed outbox failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
