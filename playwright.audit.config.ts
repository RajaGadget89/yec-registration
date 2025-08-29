// playwright.audit.config.ts - Configuration for audit tests
import { defineConfig, devices } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';

// Load environment variables from .env.e2e file
loadDotenv({ path: '.env.e2e' });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'line',
  
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'superAdmin',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: '.auth/alice_yec_dev.json',
      },
    },
    {
      name: 'adminPayment',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: '.auth/raja_gadgets89_gmail_com.json',
      },
    },
    {
      name: 'adminProfile',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: '.auth/raja_gadgets89_gmail_com.json',
      },
    },
    {
      name: 'adminTcc',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: '.auth/dave_yec_dev.json',
      },
    },
  ],

  globalSetup: require.resolve('./e2e/global.setup.ts'),
});
