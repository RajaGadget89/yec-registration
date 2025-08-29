import { test, expect } from '@playwright/test';
import { getTestHeaders, setupTestEnvironment } from './helpers/testRequestHelper';

test.describe('AC5 — Approve when all 3 PASS', () => {
  test.beforeAll(() => {
    setupTestEnvironment();
  });

  async function createRegistration(request: any) {
    const res = await request.post('/api/register', {
      data: {
        title: 'Mr', firstName: 'AC5', lastName: 'Approve', nickname: 'AC5User',
        phone: '0123456783', lineId: 'ac5_line', email: `ac5-${Date.now()}@example.com`,
        companyName: 'AC5 Co', businessType: 'technology', yecProvince: 'bangkok',
        hotelChoice: 'in-quota', roomType: 'single', travelType: 'private-car', pdpaConsent: true,
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json().catch(() => ({} as any));
    return body?.registration_id || body?.registrationId || body?.trackingCode || body?.tracking_code;
  }

  test('all three PASS -> approved and approval email queued', async ({ request }) => {
    const registrationId = await createRegistration(request);

    // Mark two dimensions PASS
    for (const dim of ['profile','payment']) {
      const r = await request.post('/api/test/mark-pass', {
        headers: getTestHeaders(),
        data: { registrationId, dimension: dim },
      });
      expect(r.status()).toBe(200);
    }

    // Peek should not be approved yet
    const peek1 = await request.get(`/api/test/peek-registration?tracking_code=${encodeURIComponent(registrationId)}`, { headers: getTestHeaders() });
    expect(peek1.status()).toBe(200);
    const p1 = await peek1.json();
    expect(p1.status).not.toBe('approved');

    // Mark final PASS
    const r3 = await request.post('/api/test/mark-pass', {
      headers: getTestHeaders(),
      data: { registrationId, dimension: 'tcc' },
    });
    expect(r3.status()).toBe(200);

    // Now approve the registration via admin API
    const approveRes = await request.post('/api/test/approve', {
      headers: getTestHeaders(),
      data: { registrationId },
    });
    expect(approveRes.status()).toBe(200);
    const approveData = await approveRes.json();
    expect(approveData.ok).toBe(true);
    expect(approveData.global).toBe('approved');
    expect(approveData.dimensions).toEqual({
      payment: 'passed',
      profile: 'passed',
      tcc: 'passed'
    });

    // Peek should now show approved
    const peek2 = await request.get(`/api/test/peek-registration?tracking_code=${encodeURIComponent(registrationId)}`, { headers: getTestHeaders() });
    expect(peek2.status()).toBe(200);
    const p2 = await peek2.json();
    expect(p2.status).toBe('approved');

    // Approval email should be queued (pending)
    const emails = await request.get('/api/test/get-pending-emails', { headers: getTestHeaders() });
    expect(emails.status()).toBe(200);
    const ej = await emails.json();
    expect(ej.count).toBeGreaterThanOrEqual(1);
  });

  test('negative case: try approve before all three are passed -> 409', async ({ request }) => {
    const registrationId = await createRegistration(request);

    // Mark only two dimensions as PASS
    for (const dim of ['profile','payment']) {
      const r = await request.post('/api/test/mark-pass', {
        headers: getTestHeaders(),
        data: { registrationId, dimension: dim },
      });
      expect(r.status()).toBe(200);
    }

    // Try to approve (should fail with 409)
    const approveRes = await request.post('/api/test/approve', {
      headers: getTestHeaders(),
      data: { registrationId },
    });
    expect(approveRes.status()).toBe(409);
    const approveData = await approveRes.json();
    expect(approveData.code).toBe('INCOMPLETE_DIMENSIONS');
    expect(approveData.missing).toContain('tcc');
  });

  test('idempotency: approve again -> 200 unchanged snapshot', async ({ request }) => {
    const registrationId = await createRegistration(request);

    // Mark all dimensions as PASS
    for (const dim of ['profile','payment','tcc']) {
      const r = await request.post('/api/test/mark-pass', {
        headers: getTestHeaders(),
        data: { registrationId, dimension: dim },
      });
      expect(r.status()).toBe(200);
    }

    // First approval
    const approveRes1 = await request.post('/api/test/approve', {
      headers: getTestHeaders(),
      data: { registrationId },
    });
    expect(approveRes1.status()).toBe(200);
    const approveData1 = await approveRes1.json();

    // Second approval (should return same snapshot)
    const approveRes2 = await request.post('/api/test/approve', {
      headers: getTestHeaders(),
      data: { registrationId },
    });
    expect(approveRes2.status()).toBe(200);
    const approveData2 = await approveRes2.json();

    // Verify both responses are identical
    expect(approveData2).toEqual(approveData1);
  });

  test('validation error: missing registrationId -> 400', async ({ request }) => {
    // Try to approve without registrationId
    const approveRes = await request.post('/api/test/approve', {
      headers: getTestHeaders(),
      data: {},
    });
    expect(approveRes.status()).toBe(400);
    const approveData = await approveRes.json();
    expect(approveData.error).toContain('registrationId is required');
  });
});


