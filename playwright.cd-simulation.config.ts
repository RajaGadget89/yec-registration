import { defineConfig, devices } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';

// Load CD-specific environment variables
let cdEnvVars: Record<string, string> = {};
if (existsSync('.cd-env')) {
  try {
    const envContent = readFileSync('.cd-env', 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        cdEnvVars[key.trim()] = value.trim();
      }
    });
  } catch (error) {
    console.warn('Could not load .cd-env file:', error);
  }
}

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 300_000, // 5 minutes - match CD job timeout
  expect: { timeout: 30_000 },
  fullyParallel: false, // Sequential execution like CD
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries to catch issues early
  workers: 1, // Single worker like CD
  reporter: [['line'], ['json', { outputFile: 'cd-simulation-report.json' }]],

  use: {
    baseURL: process.env.APP_BASE_URL || 'http://localhost:8080',
    trace: 'retain-on-failure',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { 
      name: 'cd-simulation', 
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*cd-simulation.*\.spec\.ts/
    },
  ],

  // CD-specific global setup and teardown
  globalSetup: 'tests/e2e/cd-simulation-setup.ts',
  globalTeardown: 'tests/e2e/cd-simulation-teardown.ts',

  // CD environment simulation
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    env: {
      ...cdEnvVars,
      NODE_ENV: 'test',
      SUPABASE_ENV: 'staging', // Use staging for CD simulation
      SUPABASE_NON_INTERACTIVE: '1', // Match CD environment
    },
  },
});
