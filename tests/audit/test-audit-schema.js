require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

async function testAuditSchema() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }

  console.log('🔍 Testing audit schema existence...');
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    db: { schema: 'audit' }
  });

  try {
    // Test if audit schema exists
    const { data: schemaTest, error: schemaError } = await supabase
      .from('access_log')
      .select('id')
      .limit(1);

    if (schemaError) {
      console.log('❌ Audit schema does not exist:', schemaError.message);
      console.log('📋 Next step: Run scripts/create-audit-schema.sql in Supabase SQL Editor');
      return;
    }

    console.log('✅ Audit schema exists!');
    
    // Test RPC functions
    console.log('🔍 Testing RPC functions...');
    
    const testPayload = {
      action: 'test',
      method: 'GET',
      resource: 'test',
      result: '200',
      request_id: 'test-' + Date.now(),
      src_ip: '127.0.0.1',
      user_agent: 'test-agent',
      latency_ms: 100,
      meta: { test: true }
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/log_access`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Profile': 'audit',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p: testPayload })
    });

    if (response.ok) {
      console.log('✅ RPC functions are working!');
    } else {
      console.log('❌ RPC functions failed:', response.status, response.statusText);
    }

  } catch (error) {
    console.error('❌ Error testing audit schema:', error.message);
  }
}

testAuditSchema();

