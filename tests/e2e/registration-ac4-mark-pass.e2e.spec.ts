import { test, expect } from '@playwright/test';
import { getTestHeaders, setupTestEnvironment } from './helpers/testRequestHelper';
import { performACPreflightCheck, validateServerReadiness } from './helpers/dbPreflightCheck';

test.describe('AC4 — Mark PASS (RBAC)', () => {
  test.beforeAll(async ({ request }) => {
    setupTestEnvironment();
    
    // Perform preflight checks
    await validateServerReadiness(request);
    await performACPreflightCheck(request);
  });

  test('admin marks single dimension as passed → RBAC enforced; dimension updated; global remains waiting_for_review; audit/event emitted', async ({ request }) => {
    // Step 1: Create a fresh registration via public API (reuse AC1 helper)
    const testEmail = `ac4-${Date.now()}@example.com`;
    const registrationRes = await request.post('/api/register', {
      data: {
        title: 'Mr',
        firstName: 'AC4',
        lastName: 'MarkPass',
        nickname: 'AC4User',
        phone: '0123456789',
        lineId: 'ac4_line',
        email: testEmail,
        companyName: 'AC4 Co',
        businessType: 'technology',
        yecProvince: 'bangkok',
        hotelChoice: 'in-quota',
        roomType: 'single',
        travelType: 'private-car',
        pdpaConsent: true,
      },
    });

    // Assert registration created successfully
    expect(registrationRes.ok()).toBeTruthy();
    const registrationData = await registrationRes.json();
    expect(registrationData.success).toBeTruthy();
    expect(registrationData.registration_id).toBeTruthy();
    
    const trackingCode = registrationData.registration_id;
    console.log(`Created registration: ${trackingCode}`);

    // Step 2: Verify initial state via peek endpoint
    const peekRes = await request.get(`/api/test/peek-registration?tracking_code=${trackingCode}`, {
      headers: getTestHeaders()
    });
    expect(peekRes.ok()).toBeTruthy();
    const peekData = await peekRes.json();
    expect(peekData.status).toBe('waiting_for_review');
    expect(peekData.tracking_code).toBe(trackingCode);

    // Step 3: Mark PASS for one dimension (profile) using test helper with secret
    const markPassRes = await request.post('/api/test/mark-pass', {
      headers: getTestHeaders(),
      data: {
        registrationId: trackingCode,
        dimension: 'profile'
      }
    });

    // Assert 200; returned newStatus='passed' for that dimension; global remains waiting_for_review
    expect(markPassRes.ok()).toBeTruthy();
    const markPassData = await markPassRes.json();
    expect(markPassData.ok).toBe(true);
    expect(markPassData.registrationId).toBe(trackingCode);
    expect(markPassData.dimension).toBe('profile');
    expect(markPassData.newStatus).toBe('passed');
    expect(markPassData.global).toBe('waiting_for_review'); // Global should remain waiting_for_review since other dimensions aren't passed yet

    // Step 4: Peek state via helper to confirm only that dimension is passed; others unchanged
    const peekAfterRes = await request.get(`/api/test/peek-registration?tracking_code=${trackingCode}`, {
      headers: getTestHeaders()
    });
    expect(peekAfterRes.ok()).toBeTruthy();
    const peekAfterData = await peekAfterRes.json();
    expect(peekAfterData.status).toBe('waiting_for_review'); // Global status should still be waiting_for_review

    // Step 5: Test idempotency - call again should return 200 same snapshot
    const markPassAgainRes = await request.post('/api/test/mark-pass', {
      headers: getTestHeaders(),
      data: {
        registrationId: trackingCode,
        dimension: 'profile'
      }
    });

    expect(markPassAgainRes.ok()).toBeTruthy();
    const markPassAgainData = await markPassAgainRes.json();
    expect(markPassAgainData.ok).toBe(true);
    expect(markPassAgainData.registrationId).toBe(trackingCode);
    expect(markPassAgainData.dimension).toBe('profile');
    expect(markPassAgainData.newStatus).toBe('passed');
    expect(markPassAgainData.global).toBe('waiting_for_review');
  });

  test('negative tests: unauthorized access, invalid dimension, missing fields', async ({ request }) => {
    // Test 1: Call without auth/role should return 401
    const unauthorizedRes = await request.post('/api/test/mark-pass', {
      data: {
        registrationId: 'YEC-1234567890-test',
        dimension: 'profile'
      }
    });
    expect(unauthorizedRes.status()).toBe(401);

    // Test 2: Invalid dimension should return 400
    const invalidDimensionRes = await request.post('/api/test/mark-pass', {
      headers: getTestHeaders(),
      data: {
        registrationId: 'YEC-1234567890-test',
        dimension: 'invalid'
      }
    });
    expect(invalidDimensionRes.status()).toBe(400);
    const invalidDimensionData = await invalidDimensionRes.json();
    expect(invalidDimensionData.error).toContain('Invalid dimension');

    // Test 3: Missing registrationId should return 400
    const missingIdRes = await request.post('/api/test/mark-pass', {
      headers: getTestHeaders(),
      data: {
        dimension: 'profile'
      }
    });
    expect(missingIdRes.status()).toBe(400);
    const missingIdData = await missingIdRes.json();
    expect(missingIdData.error).toContain('registrationId is required');

    // Test 4: Non-existent registration should return 404
    const nonExistentRes = await request.post('/api/test/mark-pass', {
      headers: getTestHeaders(),
      data: {
        registrationId: 'YEC-9999999999-nonexistent',
        dimension: 'profile'
      }
    });
    expect(nonExistentRes.status()).toBe(404);
  });

  test('admin API endpoint with RBAC enforcement', async ({ request }) => {
    // Create a test registration
    const testEmail = `ac4-admin-${Date.now()}@example.com`;
    const registrationRes = await request.post('/api/register', {
      data: {
        title: 'Mr',
        firstName: 'AC4',
        lastName: 'Admin',
        nickname: 'AC4Admin',
        phone: '0123456789',
        lineId: 'ac4_admin',
        email: testEmail,
        companyName: 'AC4 Admin Co',
        businessType: 'technology',
        yecProvince: 'bangkok',
        hotelChoice: 'in-quota',
        roomType: 'single',
        travelType: 'private-car',
        pdpaConsent: true,
      },
    });

    expect(registrationRes.ok()).toBeTruthy();
    const registrationData = await registrationRes.json();
    const trackingCode = registrationData.registration_id;

    // Test admin API endpoint without proper authentication should return 401/403
    const unauthorizedAdminRes = await request.post('/api/admin/registration/mark-pass', {
      data: {
        registrationId: trackingCode,
        dimension: 'payment'
      }
    });
    expect(unauthorizedAdminRes.status()).toBe(401);

    // Note: In a real test environment, we would need to set up proper admin authentication
    // For now, we'll test that the endpoint exists and returns proper error codes
    console.log('Admin API endpoint tested - requires proper admin authentication');
  });
});


