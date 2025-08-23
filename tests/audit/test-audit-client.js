require('dotenv').config({ path: '.env.local' });

// Set NODE_ENV to test to enable debug logging
process.env.NODE_ENV = 'test';

async function testAuditClient() {
  console.log('🔍 Testing audit client...');
  
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('Environment variables:');
  console.log('- SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
  console.log('- SERVICE_ROLE_KEY:', serviceRoleKey ? 'SET' : 'NOT SET');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  
  // Test logAccess
  console.log('\n📝 Testing logAccess...');
  const testAccessPayload = {
    action: 'test-access',
    method: 'GET',
    resource: 'test',
    result: '200',
    request_id: 'test-access-' + Date.now(),
    src_ip: '127.0.0.1',
    user_agent: 'test-agent',
    latency_ms: 100,
    meta: { test: true }
  };

  const accessResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/log_access`, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Profile': 'audit',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p: testAccessPayload })
  });

  console.log('Access response:', accessResponse.status, accessResponse.statusText);
  if (!accessResponse.ok) {
    const errorText = await accessResponse.text();
    console.log('Error details:', errorText);
  }

  // Test logEvent
  console.log('\n📝 Testing logEvent...');
  const testEventPayload = {
    action: 'test-event',
    resource: 'test',
    actor_role: 'system',
    result: 'success',
    correlation_id: 'test-event-' + Date.now(),
    meta: { test: true }
  };

  const eventResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/log_event`, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Profile': 'audit',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p: testEventPayload })
  });

  console.log('Event response:', eventResponse.status, eventResponse.statusText);
  if (!eventResponse.ok) {
    const errorText = await eventResponse.text();
    console.log('Error details:', errorText);
  }

  // Check if logs were written
  console.log('\n🔍 Checking if logs were written...');
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    db: { schema: 'audit' }
  });

  const { data: accessLogs, error: accessError } = await supabase
    .from('access_log')
    .select('*')
    .eq('request_id', testAccessPayload.request_id)
    .limit(1);

  if (accessError) {
    console.log('❌ Error checking access logs:', accessError.message);
  } else {
    console.log('✅ Access logs found:', accessLogs.length);
  }

  const { data: eventLogs, error: eventError } = await supabase
    .from('event_log')
    .select('*')
    .eq('correlation_id', testEventPayload.correlation_id)
    .limit(1);

  if (eventError) {
    console.log('❌ Error checking event logs:', eventError.message);
  } else {
    console.log('✅ Event logs found:', eventLogs.length);
  }
}

testAuditClient().catch(console.error);

