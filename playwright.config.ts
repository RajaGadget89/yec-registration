// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';
import fs from 'fs';

// เลือกไฟล์ env ตามสภาพแวดล้อม
// - CI: ใช้ .env.ci (workflow จะสร้างให้)
// - Local: ใช้ .env.ci.local ถ้ามี ไม่งั้น fallback เป็น .env.local
const dotenvPath = process.env.CI
  ? '.env.ci'
  : (fs.existsSync('.env.ci.local') ? '.env.ci.local' : '.env.local');

loadDotenv({ path: dotenvPath });

export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'line',

  use: {
    baseURL: 'http://localhost:8080',
    trace: 'retain-on-failure',
    headless: true,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // ถ้าต้องการ browser อื่นค่อยเพิ่มภายหลัง
  ],

  // สำคัญ: ส่ง ENV ทั้งหมดเข้า dev server ที่ Playwright เปิด
  webServer: {
    command: 'npx next dev -p 8080',
    port: 8080,
    reuseExistingServer: !process.env.CI,
    env: { ...process.env },
    timeout: 120_000,
  },
});

