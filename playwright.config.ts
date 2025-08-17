import { config as loadDotenv } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

// Load environment variables before exporting config
loadDotenv({ path: process.env.CI ? '.env.ci' : '.env.local' });

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: ['**/*.e2e.spec.ts', '**/*.spec.ts'],
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:8080',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Commented out for speed - uncomment for full browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // Temporarily disabled webServer to fix startup issues
  // webServer: {
  //   command: 'npx dotenv -e .env.local next dev -p 8080',
  //   port: 8080,
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  //   env: { 
  //     ...process.env,            // Pass all loaded environment variables to Next server
  //     PLAYWRIGHT_TEST: '1',
  //     NODE_ENV: 'test',
  //     DISPATCH_DRY_RUN: 'true',
  //     EMAIL_MODE: 'DRY_RUN', // Force dry-run mode for tests
  //     EMAIL_CAP_MAX_PER_RUN: '1',
  //     EMAIL_THROTTLE_MS: '500',
  //     EMAIL_RETRY_ON_429: '1',
  //     BLOCK_NON_ALLOWLIST: 'true',
  //     EMAIL_ALLOWLIST: 'test@example.com',
  //     RESEND_API_KEY: 'test-api-key',
  //     EMAIL_FROM: 'test@example.com'
  //   },
  // },
});
