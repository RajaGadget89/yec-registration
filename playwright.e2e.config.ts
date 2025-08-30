import { defineConfig, devices } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';

// Load environment variables from .e2e-env if it exists
let e2eEnvVars: Record<string, string> = {};
if (existsSync('.e2e-env')) {
  try {
    const envContent = readFileSync('.e2e-env', 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        e2eEnvVars[key.trim()] = value.trim();
      }
    });
  } catch (error) {
    console.warn('Could not load .e2e-env file:', error);
  }
}

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // E2E tests should run sequentially to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for E2E tests to catch issues early
  workers: 1, // Single worker for E2E tests
  reporter: 'line',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || process.env.APP_BASE_URL || 'http://localhost:8080',
    trace: 'retain-on-failure',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { 
      name: 'chromium', 
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.spec\.ts/
    },
  ],

  // Skip global setup and teardown for staging environment
  // globalSetup: 'e2e/global.setup.ts',
  // globalTeardown: 'e2e/global.teardown.ts',

  // Web server configuration with environment variables
  // Disabled since server is already running
  // webServer: {
  //   command: 'npm run dev:e2e',
  //   url: 'http://localhost:8080',
  //   reuseExistingServer: true, // Always reuse existing server
  //   env: {
  //     ...e2eEnvVars,
  //     NODE_ENV: 'test',
  //     SUPABASE_ENV: 'test', // Use test environment
  //   },
  // },
});
