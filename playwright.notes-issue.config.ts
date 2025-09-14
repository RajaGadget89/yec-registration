import { defineConfig, devices } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';

// Load environment variables from .env.local file
loadDotenv({ path: '.env.local' });

/**
 * Playwright configuration specifically for notes issue testing
 * This config focuses on capturing real-time behavior without complex setup
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/notes-issue-api-capture.spec.ts',
  
  /* Run tests in files in parallel */
  fullyParallel: false,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: 1, // Single worker for better debugging
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report-notes-issue' }],
    ['list']
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Slow down operations for better debugging */
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  /* Set environment variables for tests */
  globalSetup: require.resolve('./e2e/global.setup.ts'),

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'adminPayment',
      use: { 
        ...devices['Desktop Chrome'],
        // Use a simple auth setup for this test
        storageState: undefined, // We'll handle auth in the test
      },
    },
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./e2e/global.setup.ts'),
});
