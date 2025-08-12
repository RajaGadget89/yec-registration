import { NextResponse } from 'next/server';
import { getSupabaseAdminAudit } from '../../../lib/supabaseAdminAudit';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = getSupabaseAdminAudit();
    
    // Test 1: Try to query the audit tables directly with schema-specific client
    let hasAccessLog = false;
    let hasEventLog = false;
    let accessLogCount = 0;
    let eventLogCount = 0;

    // Test access_log table
    try {
      const { data: accessLogs, error: accessError } = await supabase
        .from('access_log') // Using schema-specific client
        .select('id')
        .limit(1);

      if (!accessError) {
        hasAccessLog = true;
        accessLogCount = accessLogs?.length || 0;
      } else {
        console.log('Access log table error:', accessError);
      }
    } catch (error) {
      console.log('Access log table not accessible:', error);
    }

    // Test event_log table
    try {
      const { data: eventLogs, error: eventError } = await supabase
        .from('event_log') // Using schema-specific client
        .select('id')
        .limit(1);

      if (!eventError) {
        hasEventLog = true;
        eventLogCount = eventLogs?.length || 0;
      } else {
        console.log('Event log table error:', eventError);
      }
    } catch (error) {
      console.log('Event log table not accessible:', error);
    }

    // Test 2: Try to insert a test record with timezone-aware timestamp
    let insertSuccess = false;
    let insertError = null;
    const testRequestId = `schema-test-${Date.now()}`;
    
    // Create a timezone-aware timestamp (Asia/Bangkok)
    const now = new Date();
    const bangkokTime = new Date(now.getTime() + (7 * 60 * 60 * 1000)); // GMT+7
    const timezoneAwareTimestamp = bangkokTime.toISOString();

    if (hasAccessLog) {
      try {
        const { error: insertErr } = await supabase
          .from('access_log')
          .insert({
            action: 'schema-test',
            method: 'GET',
            resource: '/api/diag/audit-schema-test',
            result: '200',
            request_id: testRequestId,
            src_ip: '127.0.0.1',
            user_agent: 'schema-test',
            latency_ms: 50,
            meta: { 
              test: true, 
              timezone: 'Asia/Bangkok',
              timestamp: timezoneAwareTimestamp
            }
          });

        if (!insertErr) {
          insertSuccess = true;
        } else {
          insertError = insertErr.message;
        }
      } catch (error) {
        insertError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Test 3: Check for recent audit logs (last 24 hours in Bangkok time)
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const bangkokTwentyFourHoursAgo = new Date(twentyFourHoursAgo.getTime() + (7 * 60 * 60 * 1000));
    
    let recentAccessLogs = 0;
    let recentEventLogs = 0;

    try {
      const { data: recentAccess, error: recentAccessError } = await supabase
        .from('access_log')
        .select('id')
        .gte('occurred_at_utc', bangkokTwentyFourHoursAgo.toISOString());

      if (!recentAccessError) {
        recentAccessLogs = recentAccess?.length || 0;
      }
    } catch (error) {
      console.log('Recent access logs query error:', error);
    }

    try {
      const { data: recentEvents, error: recentEventsError } = await supabase
        .from('event_log')
        .select('id')
        .gte('occurred_at_utc', bangkokTwentyFourHoursAgo.toISOString());

      if (!recentEventsError) {
        recentEventLogs = recentEvents?.length || 0;
      }
    } catch (error) {
      console.log('Recent event logs query error:', error);
    }

    return NextResponse.json({
      ok: true,
      message: 'Audit schema test completed',
      timestamp: new Date().toISOString(),
      timezone: {
        current: 'UTC',
        bangkok_offset: '+7',
        bangkok_time: timezoneAwareTimestamp
      },
      results: {
        tables: {
          access_log: hasAccessLog,
          event_log: hasEventLog
        },
        table_access: {
          access_log: accessLogCount > 0,
          event_log: eventLogCount > 0
        },
        insert_test: insertSuccess,
        insert_error: insertError,
        recent_logs: {
          access_log: recentAccessLogs,
          event_log: recentEventLogs,
          time_window: 'Last 24 hours (Bangkok time)'
        }
      },
      test_request_id: testRequestId
    });

  } catch (error) {
    console.error('Audit schema test error:', error);
    return NextResponse.json({
      ok: false,
      error: 'Unexpected error during audit schema test',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
