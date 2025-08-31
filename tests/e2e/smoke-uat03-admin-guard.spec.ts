import { test, expect } from '@playwright/test';
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAILS?.split(',')[0] || process.env.SUPER_ADMIN_EMAIL || '';

// Helper to GET with optional super admin header
async function getJson(request, url: string, superAdmin = false) {
  const res = await request.get(url, {
    headers: {
      'X-Request-ID': `smoke-uat03-${Date.now()}`,
      ...(superAdmin ? { 'admin-email': SUPER_ADMIN_EMAIL } : {}),
    },
  });
  return { res, json: await res.json().catch(() => ({})) };
}

test.describe('UAT‑03 Admin guard smoke', () => {
  test('admins endpoint: 200 with super_admin, 401/403 without', async ({ request }) => {
    const ok = await getJson(request, '/api/admin/management/admins', true);
    expect(ok.res.status()).toBe(200);
    expect(Array.isArray(ok.json.admins)).toBeTruthy();

    const bad = await getJson(request, '/api/admin/management/admins', false);
    expect([401,403]).toContain(bad.res.status());
  });

  test('activity endpoint: 200 with super_admin', async ({ request }) => {
    const { res, json } = await getJson(request, '/api/admin/management/activity', true);
    expect(res.status()).toBe(200);
    expect(Array.isArray(json.activities)).toBeTruthy();
  });
});
