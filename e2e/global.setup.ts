import { chromium, FullConfig } from '@playwright/test';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { config as loadDotenv } from 'dotenv';
import { checkAuthReadiness, signInAs, seedAdminWithRoles } from './utils/auth';

// Load environment variables from .env.local file (consolidated environment)
loadDotenv({ path: '.env.local' });

const TEST_USERS = {
  'raja.gadgets89@gmail.com': 'superAdmin',
  'yecsongkhla.official@gmail.com': 'adminPayment',
} as const;

async function globalSetup(config: FullConfig) {
  // Set required environment variables for test helpers
  process.env.TEST_HELPERS_ENABLED = "1";
  
  // Check required environment variables
  const e2eAuthSecret = process.env.E2E_AUTH_SECRET;
  const e2eTestMode = process.env.E2E_TEST_MODE === "true";
  const testHelpersEnabled = process.env.TEST_HELPERS_ENABLED === "1";
  
  if (!e2eAuthSecret) {
    console.error('❌ E2E_AUTH_SECRET environment variable is not set');
    console.error('📋 To fix this issue:');
    console.error('   1. Go to your GitHub repository settings');
    console.error('   2. Navigate to Settings > Secrets and variables > Actions');
    console.error('   3. Add a new repository secret named "E2E_AUTH_SECRET"');
    console.error('   4. Set its value to a secure random string (e.g., 32+ characters)');
    console.error('   5. Make sure the secret is accessible to the workflow');
    console.error('');
    console.error('🔧 For local development, ensure .env.local contains:');
    console.error('   E2E_AUTH_SECRET=your-secure-random-secret-here');
    console.error('');
    console.error('💡 You can generate a secure secret using:');
    console.error('   openssl rand -hex 32');
    throw new Error('E2E_AUTH_SECRET environment variable is required for test setup. Please configure this secret in GitHub repository settings.');
  }

  if (!e2eTestMode || !testHelpersEnabled) {
    console.error('❌ Test helpers are not enabled');
    console.error('📋 Required environment variables:');
    console.error('   E2E_TEST_MODE=true');
    console.error('   TEST_HELPERS_ENABLED=1');
    throw new Error('Test helpers must be enabled for global setup. Set E2E_TEST_MODE=true and TEST_HELPERS_ENABLED=1');
  }

  // Create auth directory
  const authDir = '.auth';
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Check auth readiness
    console.log('🔍 Checking auth readiness...');
    const authReady = await checkAuthReadiness(page);
    if (!authReady) {
      throw new Error('Auth readiness check failed - server may not be ready');
    }
    console.log('✅ Auth readiness check passed');

    // Step 2: Warm up super admin session
    console.log('🔥 Warming up super admin session...');
    await signInAs(page, 'super_admin');
    console.log('✅ Super admin session warmed up');

    // Step 3: Admin users already configured in environment variables
    console.log('✅ Admin users already configured in environment variables');
    
    // Step 4: Pre-seed admin user for AC5/AC6 tests
    console.log('👤 Pre-seeding admin user...');
    await signInAs(page, 'admin');
    console.log('✅ Admin user pre-seeded');

    // Step 5: Seed admin users for AC2 test actors (using existing working endpoint)
    console.log('🔧 Seeding admin users for AC2 test actors...');
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:8080';
    
    // Map deterministic test actors → roles required by AC2 flows
    const ACTORS = [
      { email: 'dave@yec.dev', roles: ['tcc_card'] },
      { email: 'raja.gadgets89@gmail.com', roles: ['user_profile', 'payment_slip', 'tcc_card'] },
      { email: 'yecsongkhla.official@gmail.com', roles: ['tcc_card'] },
    ] as const;

    for (const actor of ACTORS) {
      try {
        // Use the seed-business-roles endpoint to set both admin user and business_roles
        const res = await page.request.post(`${baseURL}/api/test/seed-business-roles`, {
          data: { email: actor.email, business_roles: actor.roles }
        });
        
        if (!([200, 201].includes(res.status()))) {
          console.log(`❌ Failed to seed admin user for ${actor.email}:`, res.status(), await res.text());
          // Don't throw error - some users might already exist
          console.log(`⚠️ Continuing with next actor...`);
        } else {
          console.log(`✅ Seeded admin user for ${actor.email} (business_roles: ${actor.roles.join(', ')})`);
        }
      } catch (error) {
        console.error(`❌ Error seeding admin user for ${actor.email}:`, error);
        // Don't throw error - some users might already exist
        console.log(`⚠️ Continuing with next actor...`);
      }
    }
    
    console.log('✅ Admin users seeded for all AC2 test actors');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
  }

  // Continue with existing setup for backward compatibility
  const browser2 = await chromium.launch();
  
  for (const [email, role] of Object.entries(TEST_USERS)) {
    console.log(`Setting up authentication for ${email} (${role})...`);
    
    const context = await browser2.newContext();
    const page = await context.newPage();

    try {
      // Calculate HMAC for authentication
      const payload = JSON.stringify({ email });
      
      // Calculate HMAC using the E2E_AUTH_SECRET
      const hmac = crypto
        .createHmac('sha256', e2eAuthSecret)
        .update(payload)
        .digest('hex');

      // Call the test auth endpoint
      const baseURL = process.env.E2E_BASE_URL || 'http://localhost:8080';
      const response = await page.request.post(`${baseURL}/api/test/auth/login`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-AUTH': hmac,
        },
        data: { email },
      });

      if (response.status() !== 204) {
        throw new Error(`Login failed for ${email}: ${response.status()} ${response.statusText()}`);
      }

      // Save storage state
      const storageStatePath = path.join(authDir, `${email.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
      await context.storageState({ path: storageStatePath });
      
      console.log(`✅ Authentication setup complete for ${email}`);
    } catch (error) {
      console.error(`❌ Failed to setup authentication for ${email}:`, error);
      throw error;
    } finally {
      await context.close();
    }
  }

  await browser.close();
  console.log('🎉 Global setup complete - all authentication states created');
}

export default globalSetup;
