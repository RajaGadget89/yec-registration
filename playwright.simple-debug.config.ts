import { defineConfig, devices } from '@playwright/test';

/**
 * Simple Playwright configuration for Admin Delete UI Debug
 */

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/admin-delete-ui-simple-debug.spec.ts',
  
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  
  reporter: [
    ['html', { outputFolder: 'playwright-report-simple-debug' }],
    ['list']
  ],
  
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-web-security']
        }
      },
    },
  ],

  webServer: {
    command: 'echo "Server should already be running on localhost:8080"',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
