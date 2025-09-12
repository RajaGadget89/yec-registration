import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const ctx = JSON.parse(readFileSync('e2e/.auth/context.json', 'utf8')) as { regId: string };
const REG_ID = ctx.regId;

const ADMIN_ME = '/api/admin/me';
const MARK_PASS = (id: string) => `/api/admin/registrations/${id}/mark-pass`;
const REQUEST_UPDATE = (id: string) => `/api/admin/registrations/${id}/request-update`;

async function expectMeOk(page: any) {
  const r = await page.request.get(ADMIN_ME);
  expect.soft([200]).toContain(r.status());
}

// super_admin
test.describe('super_admin', () => {
  test.use({ storageState: 'e2e/.auth/super_admin.json' });
  
  test('me ok + privileged pass', async ({ page }) => {
    await expectMeOk(page);
    
    // Super admin should be able to mark pass for payment dimension
    const mp = await page.request.post(MARK_PASS(REG_ID), { 
      data: { dimension: 'payment', note: 'ok' } 
    });
    expect([200, 201]).toContain(mp.status());
  });
});

// payment only
test.describe('admin_payment_only', () => {
  test.use({ storageState: 'e2e/.auth/admin_payment.json' });
  
  test('payment allowed; tcc forbidden', async ({ page }) => {
    await expectMeOk(page);
    
    // Payment admin should be able to mark pass for payment dimension
    const mp = await page.request.post(MARK_PASS(REG_ID), { 
      data: { dimension: 'payment', note: 'ok' } 
    });
    expect([200, 201]).toContain(mp.status());
    
    // Payment admin should NOT be able to request update for tcc dimension
    const ru = await page.request.post(REQUEST_UPDATE(REG_ID), { 
      data: { dimension: 'tcc', notes: 'test' } 
    });
    expect(ru.status()).toBe(403);
  });
});

// tcc only
test.describe('admin_tcc_only', () => {
  test.use({ storageState: 'e2e/.auth/admin_tcc.json' });
  
  test('tcc allowed; payment forbidden', async ({ page }) => {
    await expectMeOk(page);
    
    // TCC admin should be able to request update for tcc dimension
    const ru = await page.request.post(REQUEST_UPDATE(REG_ID), { 
      data: { dimension: 'tcc', notes: 'test' } 
    });
    expect([200, 201]).toContain(ru.status());
    
    // TCC admin should NOT be able to mark pass for payment dimension
    const mp = await page.request.post(MARK_PASS(REG_ID), { 
      data: { dimension: 'payment', note: 'ok' } 
    });
    expect(mp.status()).toBe(403);
  });
});