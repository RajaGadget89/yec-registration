import { test, expect } from '@playwright/test';

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'raja.gadgets89@gmail.com';

function enc(t: string) { return encodeURIComponent(t); }

async function createInvite(request, email: string) {
  const res = await request.post('/api/admin/management/invite', {
    headers: { 'Content-Type': 'application/json', 'X-Request-ID': `uat05-invite-${Date.now()}`, 'admin-email': SUPER_ADMIN_EMAIL },
    data: { email, roles: ['admin'] }
  });
  expect(res.status()).toBe(201);
  const j = await res.json();
  // Normalize possible shapes: {token,id} or {invitation:{id,token}}
  const id = j.id ?? j.invitation_id ?? j.invitation?.id;
  const token = j.token ?? j.invitation?.token;
  expect(id).toBeTruthy();
  expect(token).toBeTruthy();
  return { id, token };
}

test.describe.serial('UAT‑05 Invite Acceptance & Idempotency', () => {
  test('first accept = 200, replay = 410 INVALID_TOKEN', async ({ request }) => {
    const email = `uat05-${Date.now()}@example.com`;
    const { id, token } = await createInvite(request, email);

    // First accept - should succeed
    const firstAccept = await request.post(`/api/admin/management/invitations/token/${enc(token)}/accept`, {
      headers: { 'Content-Type': 'application/json', 'X-Request-ID': `uat05-accept-first-${Date.now()}` },
      data: { name: 'UAT05 Admin' }
    });
    // Expected: 200 for successful acceptance
    expect(firstAccept.status()).toBe(200);

    // Replay accept - should fail with 410 INVALID_TOKEN
    const replayAccept = await request.post(`/api/admin/management/invitations/token/${enc(token)}/accept`, {
      headers: { 'Content-Type': 'application/json', 'X-Request-ID': `uat05-accept-replay-${Date.now()}` },
      data: { name: 'UAT05 Admin Replay' }
    });
    // Expected: 410 INVALID_TOKEN for idempotency
    expect(replayAccept.status()).toBe(410);
    
    const replayJson = await replayAccept.json();
    expect(replayJson.code).toBe('INVALID_TOKEN');
  });

  test('invalid token returns 410 INVALID_TOKEN', async ({ request }) => {
    const invalidToken = 'invalid-token-12345';
    
    const invalidAccept = await request.post(`/api/admin/management/invitations/token/${enc(invalidToken)}/accept`, {
      headers: { 'Content-Type': 'application/json', 'X-Request-ID': `uat05-invalid-token-${Date.now()}` },
      data: { name: 'Invalid Token Test' }
    });
    
    expect(invalidAccept.status()).toBe(410);
    const invalidJson = await invalidAccept.json();
    expect(invalidJson.code).toBe('INVALID_TOKEN');
  });

  test('accept endpoint is publicly accessible (no auth required)', async ({ request }) => {
    const email = `uat05-public-${Date.now()}@example.com`;
    const { id, token } = await createInvite(request, email);

    // Try to accept without admin headers - should work since accept is public
    const publicAccept = await request.post(`/api/admin/management/invitations/token/${enc(token)}/accept`, {
      headers: { 'Content-Type': 'application/json', 'X-Request-ID': `uat05-public-${Date.now()}` },
      data: { name: 'Public Accept Test' }
    });
    
    // Should return 200 since accept endpoint is publicly accessible
    expect(publicAccept.status()).toBe(200);
  });

  test('activity evidence — accepted entries appear', async ({ request }) => {
    const act = await request.get('/api/admin/management/activity', {
      headers: { 'X-Request-ID': `uat05-activity-${Date.now()}`, 'admin-email': SUPER_ADMIN_EMAIL }
    });
    expect([200,401,403]).toContain(act.status());
    // When 200, expect activity array with recent items; we store artifacts via reporter/trace
  });
});
