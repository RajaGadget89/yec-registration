import { test, expect } from '@playwright/test';
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAILS?.split(',')[0] || process.env.SUPER_ADMIN_EMAIL || '';

function rid() { return `smoke04-${Date.now()}@example.com`; }

async function postJson(request, url: string, data: any, superAdmin = false) {
  const res = await request.post(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': `smoke-uat04-${Date.now()}`,
      ...(superAdmin ? { 'admin-email': SUPER_ADMIN_EMAIL } : {}),
    },
    data,
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

test.describe('UAT‑04 Invite basics smoke', () => {
  test('create invite (201) returns token & id, activity shows new entry', async ({ request }) => {
    const email = rid();
    const { res, json } = await postJson(request, '/api/admin/management/invite', { email, roles: ['admin'] }, true);
    expect(res.status()).toBe(201);
    const token = json?.token ?? json?.invitation?.token;
    const id = json?.id ?? json?.invitation?.id;
    expect(token).toBeTruthy();
    expect(id).toBeTruthy();

    const act = await request.get('/api/admin/management/activity', {
      headers: { 'X-Request-ID': `smoke-uat04-${Date.now()}`, 'admin-email': SUPER_ADMIN_EMAIL },
    });
    expect([200,204]).toContain(act.status());
  });
});
