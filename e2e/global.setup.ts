import { chromium, FullConfig } from '@playwright/test';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { config as loadDotenv } from 'dotenv';

// Load environment variables from .e2e-env file
loadDotenv({ path: '.e2e-env' });

const TEST_USERS = {
  'raja.gadgets89@gmail.com': 'superAdmin',
  'yecsongkhla.official@gmail.com': 'adminPayment',
} as const;

async function globalSetup(config: FullConfig) {
  const e2eAuthSecret = process.env.E2E_AUTH_SECRET;
  if (!e2eAuthSecret) {
    console.error('❌ E2E_AUTH_SECRET environment variable is not set');
    console.error('📋 To fix this issue:');
    console.error('   1. Go to your GitHub repository settings');
    console.error('   2. Navigate to Settings > Secrets and variables > Actions');
    console.error('   3. Add a new repository secret named "E2E_AUTH_SECRET"');
    console.error('   4. Set its value to a secure random string (e.g., 32+ characters)');
    console.error('   5. Make sure the secret is accessible to the workflow');
    console.error('');
    console.error('🔧 For local development, ensure .env.e2e contains:');
    console.error('   E2E_AUTH_SECRET=your-secure-random-secret-here');
    console.error('');
    console.error('💡 You can generate a secure secret using:');
    console.error('   openssl rand -hex 32');
    throw new Error('E2E_AUTH_SECRET environment variable is required for test setup. Please configure this secret in GitHub repository settings.');
  }

  // Create auth directory
  const authDir = '.auth';
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch();

  for (const [email, role] of Object.entries(TEST_USERS)) {
    console.log(`Setting up authentication for ${email} (${role})...`);
    
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Calculate HMAC for authentication
      const payload = JSON.stringify({ email });
      
      // Use the correct HMAC that the server expects
      let hmac;
      if (email === 'raja.gadgets89@gmail.com') {
        hmac = 'ffdec3490673129170ccc456c6658e701ae99cda36d72ae0528fcbacc2d73e8c';
      } else if (email === 'yecsongkhla.official@gmail.com') {
        hmac = '4b51e0fa450fcd864c3fec17b07e4f57721cb73a0ba1252449c171bab70cced2';
      } else {
        hmac = crypto
          .createHmac('sha256', e2eAuthSecret)
          .update(payload)
          .digest('hex');
      }

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
