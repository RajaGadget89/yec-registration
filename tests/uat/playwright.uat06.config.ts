import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // IMPORTANT: no globalSetup here
  reporter: [['line'], ['html', { outputFolder: 'artifacts/e2e/uat06/html' }], ['junit', { outputFile: 'artifacts/e2e/uat06/junit.xml' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    trace: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
