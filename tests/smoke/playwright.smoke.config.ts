import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: { 
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080' 
  },
  globalSetup: './e2e/global.setup.smoke.ts',
  reporter: [['list']],
  projects: [
    {
      name: 'smoke',
      testMatch: '**/smoke.api.enforcement.spec.ts',
    },
  ],
});