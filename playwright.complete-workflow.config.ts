import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'complete-request-update-workflow.spec.ts',
  timeout: 60000,
  retries: 2,
  workers: 1,
  use: {
    baseURL: 'http://localhost:8080',
    headless: false,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'adminPayment',
      use: {
        storageState: '.auth/raja_gadgets89_gmail_com.json',
      },
    },
  ],
  globalSetup: require.resolve('./e2e/global.setup.ts'),
  reporter: [
    ['html', { outputFolder: 'playwright-report-complete-workflow' }],
    ['list'],
  ],
});

