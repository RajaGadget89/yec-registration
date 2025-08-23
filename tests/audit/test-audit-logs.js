require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testAuditLogs() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Testing audit logs...');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing required environment variables');
    return;
  }

  const client = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Test access_log table
    console.log('\nChecking access_log table...');
    const accessResult = await client
      .from('audit.access_log')
      .select('*')
      .order('occurred_at_utc', { ascending: false })
      .limit(5);
    
    console.log('Recent access logs:', accessResult.data?.length || 0);
    if (accessResult.data && accessResult.data.length > 0) {
      accessResult.data.forEach((log, i) => {
        console.log(`  [${i}] ${log.action} -> ${log.result} (${log.request_id})`);
      });
    }

    // Test event_log table
    console.log('\nChecking event_log table...');
    const eventResult = await client
      .from('audit.event_log')
      .select('*')
      .order('occurred_at_utc', { ascending: false })
      .limit(5);
    
    console.log('Recent event logs:', eventResult.data?.length || 0);
    if (eventResult.data && eventResult.data.length > 0) {
      eventResult.data.forEach((log, i) => {
        console.log(`  [${i}] ${log.action} -> ${log.resource} (${log.correlation_id})`);
      });
    }

    // Test specific request ID
    const testRequestId = 'test-789';
    console.log(`\nChecking for request ID: ${testRequestId}`);
    
    const [specificAccess, specificEvents] = await Promise.all([
      client.from('audit.access_log').select('*').eq('request_id', testRequestId),
      client.from('audit.event_log').select('*').eq('correlation_id', testRequestId)
    ]);

    console.log(`Access logs for ${testRequestId}:`, specificAccess.data?.length || 0);
    console.log(`Event logs for ${testRequestId}:`, specificEvents.data?.length || 0);

  } catch (error) {
    console.error('Error testing audit logs:', error.message);
  }
}

testAuditLogs();
