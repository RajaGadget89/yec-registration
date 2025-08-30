import { defineConfig } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';

// Load environment variables from .e2e-env file
loadDotenv({ path: '.e2e-env' });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Sequential for CI
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for fast feedback
  workers: 1, // Single worker for CI
  reporter: 'line',
  timeout: 30000,
  
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',
    trace: 'off', // No tracing for speed
  },

  projects: [
    {
      name: 'ci-health',
      testMatch: /.*ci-health-check\.spec\.ts/,
    },
  ],

  // Global setup to ensure environment is loaded
  globalSetup: undefined, // No global setup needed for health checks
});
