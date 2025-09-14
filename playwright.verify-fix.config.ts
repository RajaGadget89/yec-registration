import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'verify-fix-summary.spec.ts',
  timeout: 30000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: 'http://localhost:8080',
    headless: false,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
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
    ['html', { outputFolder: 'playwright-report-verify-fix' }],
    ['list'],
  ],
});
