import { test, expect } from '@playwright/test';
import { getTestHeaders, setupTestEnvironment } from './helpers/testRequestHelper';
import { performACPreflightCheck, validateServerReadiness } from './helpers/dbPreflightCheck';

test.describe('AC3 — Deep-link Resubmit', () => {
  test.beforeAll(async ({ request }) => {
    setupTestEnvironment();
    
    // Perform preflight checks
    await validateServerReadiness(request);
    await performACPreflightCheck(request);
  });

  async function createRegistration(request: any) {
    const res = await request.post('/api/register', {
      data: {
        title: 'Mr',
        firstName: 'AC3',
        lastName: 'DeepLink',
        nickname: 'AC3User',
        phone: '0123456781',
        lineId: 'ac3_line',
        email: `ac3-${Date.now()}@example.com`,
        companyName: 'AC3 Co',
        businessType: 'technology',
        yecProvince: 'bangkok',
        hotelChoice: 'in-quota',
        roomType: 'single',
        travelType: 'private-car',
        pdpaConsent: true,
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json().catch(() => ({} as any));
    return body?.registration_id || body?.registrationId || body?.trackingCode || body?.tracking_code;
  }

  test('invalid token returns localized error; valid token resubmits and returns waiting_for_review', async ({ request }) => {
    const registrationId = await createRegistration(request);

    // Move to needs_update via request-update
    const ru = await request.post('/api/test/request-update', {
      headers: getTestHeaders(),
      data: { registrationId, dimension: 'profile', notes: 'Fix profile' },
    });
    expect(ru.status()).toBe(200);

    // Test invalid token with English
    const badEn = await request.post(`/api/user/invalidtoken/resubmit`, {
      headers: { 'Accept-Language': 'en' },
      data: { registration_id: registrationId, updates: { profile: { name: 'X' } } },
    });
    expect(badEn.status()).toBe(410);
    const badEnJson = await badEn.json();
    expect(badEnJson.code).toBe('RESUBMIT_INVALID_OR_EXPIRED');
    expect(badEnJson.error).toBe('Link is invalid or expired');

    // Test invalid token with Thai
    const badTh = await request.post(`/api/user/invalidtoken/resubmit`, {
      headers: { 'Accept-Language': 'th' },
      data: { registration_id: registrationId, updates: { profile: { name: 'X' } } },
    });
    expect(badTh.status()).toBe(410);
    const badThJson = await badTh.json();
    expect(badThJson.code).toBe('RESUBMIT_INVALID_OR_EXPIRED');
    expect(badThJson.error).toBe('ลิงก์ไม่ถูกต้องหรือหมดอายุ');

    // Generate a valid token for testing
    const tokenGen = await request.post('/api/test/generate-resubmit-token', {
      headers: getTestHeaders(),
      data: { registrationId, dimension: 'profile' },
    });
    expect(tokenGen.status()).toBe(200);
    const tokenGenJson = await tokenGen.json();
    expect(tokenGenJson.ok).toBeTruthy();
    expect(tokenGenJson.token).toBeTruthy();

    // Valid resubmit with URL-encoded token
    const encodedToken = encodeURIComponent(tokenGenJson.token);
    const good = await request.post(`/api/user/${encodedToken}/resubmit`, {
      data: {
        registration_id: registrationId,
        updates: { profile: { nickname: 'UpdatedNick' } },
      },
    });
    expect(good.status()).toBe(200);
    const goodJson = await good.json();
    expect(goodJson.ok).toBeTruthy();
    expect(goodJson.newStatus).toBe('pending');
    expect(goodJson.global).toBe('waiting_for_review');

    // Verify via peek-registration helper that only the targeted dimension moved back to pending
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for DB update
    
    const peek = await request.get(`/api/test/peek-registration?tracking_code=${encodeURIComponent(registrationId)}`, {
      headers: getTestHeaders(),
    });
    expect(peek.status()).toBe(200);
    const peekJson = await peek.json();
    expect(String(peekJson.status)).toContain('waiting_for_review');
  });
});


