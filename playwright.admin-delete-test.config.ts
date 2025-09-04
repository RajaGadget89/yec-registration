import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'adminDeleteTest',
      use: { 
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // Skip global setup for this test
  globalSetup: undefined,
});

