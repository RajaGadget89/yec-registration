import { chromium, FullConfig } from '@playwright/test';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { config as loadDotenv } from 'dotenv';

// Load environment variables from .env.e2e file
loadDotenv({ path: '.env.e2e' });

const TEST_USERS = {
  'alice@yec.dev': 'superAdmin',
  'raja.gadgets89@gmail.com': 'adminPayment',
  'dave@yec.dev': 'adminTcc',
} as const;

async function globalSetup(config: FullConfig) {
  const e2eAuthSecret = process.env.E2E_AUTH_SECRET;
  if (!e2eAuthSecret) {
    throw new Error('E2E_AUTH_SECRET environment variable is required for test setup');
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
      const hmac = crypto
        .createHmac('sha256', e2eAuthSecret)
        .update(payload)
        .digest('hex');

      // Call the test auth endpoint
      const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3001';
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
