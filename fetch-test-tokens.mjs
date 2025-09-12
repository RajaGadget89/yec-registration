#!/usr/bin/env node

/**
 * Fetch Real Test Tokens for P0 Evidence Collection
 * 
 * This script fetches real admin invite tokens and TCC fix tokens from the database
 * and updates the .env.local file with working deep-links for testing.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

// Load environment variables
const envContent = readFileSync('.env.local', 'utf8');
const envLines = envContent.split('\n');

// Extract Supabase configuration
const supabaseUrl = envLines.find(line => line.startsWith('SUPABASE_URL='))?.split('=')[1];
const supabaseServiceKey = envLines.find(line => line.startsWith('SUPABASE_SERVICE_ROLE_KEY='))?.split('=')[1];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fetchAdminInviteToken() {
  try {
    console.log('🔍 Fetching admin invite token...');
    
    // Look for pending admin invitations
    const { data: invitations, error } = await supabase
      .from('admin_invitations')
      .select('token, email, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('❌ Error fetching admin invitations:', error);
      return null;
    }
    
    if (invitations && invitations.length > 0) {
      const token = invitations[0].token;
      console.log(`✅ Found admin invite token: ${token.substring(0, 20)}...`);
      return token;
    } else {
      console.log('⚠️ No pending admin invitations found');
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching admin invite token:', error);
    return null;
  }
}

async function fetchTccFixToken() {
  try {
    console.log('🔍 Fetching TCC fix token...');
    
    // Look for registrations that need TCC fix
    const { data: registrations, error } = await supabase
      .from('registrations')
      .select('id, email, status, tcc_fix_token')
      .in('status', ['tcc_rejected', 'tcc_fix_requested'])
      .not('tcc_fix_token', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('❌ Error fetching TCC fix tokens:', error);
      return null;
    }
    
    if (registrations && registrations.length > 0) {
      const token = registrations[0].tcc_fix_token;
      console.log(`✅ Found TCC fix token: ${token.substring(0, 20)}...`);
      return token;
    } else {
      console.log('⚠️ No TCC fix tokens found');
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching TCC fix token:', error);
    return null;
  }
}

async function updateEnvFile(adminToken, tccToken) {
  try {
    console.log('📝 Updating .env.local with real tokens...');
    
    let updatedContent = envContent;
    
    if (adminToken) {
      updatedContent = updatedContent.replace(
        /TEST_ADMIN_INVITE_URL=.*/,
        `TEST_ADMIN_INVITE_URL=http://localhost:8080/admin/accept?token=${adminToken}`
      );
    }
    
    if (tccToken) {
      updatedContent = updatedContent.replace(
        /TEST_TCC_FIX_URL=.*/,
        `TEST_TCC_FIX_URL=http://localhost:8080/update?t=${tccToken}`
      );
    }
    
    writeFileSync('.env.local', updatedContent);
    console.log('✅ .env.local updated successfully');
    
    return { adminToken, tccToken };
  } catch (error) {
    console.error('❌ Error updating .env.local:', error);
    return null;
  }
}

async function main() {
  console.log('🚀 Fetching Real Test Tokens for P0 Evidence Collection');
  console.log('======================================================');
  
  const adminToken = await fetchAdminInviteToken();
  const tccToken = await fetchTccFixToken();
  
  if (!adminToken && !tccToken) {
    console.log('⚠️ No tokens found. You may need to:');
    console.log('   1. Create an admin invitation');
    console.log('   2. Create a registration with TCC fix request');
    console.log('   3. Or use mock tokens for testing');
    return;
  }
  
  const result = await updateEnvFile(adminToken, tccToken);
  
  if (result) {
    console.log('\n🎯 Ready for Testing!');
    console.log('====================');
    if (result.adminToken) {
      console.log(`✅ Admin Invite URL: http://localhost:8080/admin/accept?token=${result.adminToken.substring(0, 20)}...`);
    }
    if (result.tccToken) {
      console.log(`✅ TCC Fix URL: http://localhost:8080/update?t=${result.tccToken.substring(0, 20)}...`);
    }
    console.log('\n📋 Next Steps:');
    console.log('1. Run: node tests/utils/reporting/p0-delta-scan.mjs');
    console.log('2. Run: npx playwright test tests/e2e/ac*_ui_only.spec.ts --config=playwright.e2e.config.ts');
    console.log('3. Run: node tests/utils/reporting/build-p0-evidence.mjs');
  }
}

main().catch(console.error);
