// playwright.ci.config.ts - Configuration for CI environment (no authentication)
import { defineConfig, devices } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';

// Load environment variables from .env.e2e file if available
loadDotenv({ path: '.env.e2e' });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'line',
  
  // No global setup for CI - diagnostic tests don't need authentication
  


  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // CI-specific settings
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  
  // Output directory for test artifacts
  outputDir: 'test-results/ci',
  
  // Disable video and screenshot capture in CI for performance
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    video: 'off',
    screenshot: 'only-on-failure',
  },
});
