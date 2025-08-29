// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.e2e file
loadDotenv({ path: '.env.e2e' });

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
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

  /* Global setup and teardown */
  globalSetup: require.resolve('./e2e/global.setup.ts'),
});

