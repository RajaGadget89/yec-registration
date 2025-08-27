// playwright.test.config.ts - Temporary config for testing with existing server
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'superAdmin',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: '.auth/alice@yec.dev.json',
      },
    },
    {
      name: 'adminPayment',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: '.auth/raja.gadgets89@gmail.com.json',
      },
    },
    {
      name: 'adminProfile',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: '.auth/raja.gadgets89@gmail.com.json',
      },
    },
    {
      name: 'adminTcc',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: '.auth/dave@yec.dev.json',
      },
    },
  ],

  // No webServer since we're using existing server
  globalSetup: require.resolve('./e2e/global.setup.ts'),
});
