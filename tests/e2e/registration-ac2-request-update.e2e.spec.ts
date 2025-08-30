import { test, expect } from '@playwright/test';
import { getTestHeaders, setupTestEnvironment } from './helpers/testRequestHelper';
import { performACPreflightCheck, validateServerReadiness } from './helpers/dbPreflightCheck';

test.describe('AC2 — Request Update', () => {
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
        firstName: 'AC2',
        lastName: 'RequestUpdate',
        nickname: 'AC2User',
        phone: '0123456782',
        lineId: 'ac2_line',
        email: `ac2-${Date.now()}@example.com`,
        companyName: 'AC2 Co',
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

  test('admin requests update → status changes to waiting_for_update_*; email sent', async ({ request }) => {
    // Step 1: Create fresh registration and capture tracking code
    const registrationId = await createRegistration(request);
    console.log(`Created registration: ${registrationId}`);

    // Step 2: Call gated helper to request update for profile dimension
    const res = await request.post('/api/test/request-update', {
      headers: getTestHeaders(),
      data: { 
        registrationId, 
        dimension: 'profile', 
        notes: 'Please update your profile information' 
      },
    });

    // Step 3: Assert basic response structure (not specific message text)
    expect(res.ok()).toBeTruthy();
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.ok).toBeTruthy();
    expect(body.registrationId).toBe(registrationId);
    expect(body.dimension).toBe('profile');
    expect(body.status).toBeTruthy(); // Just verify it's not empty

    // Step 4: Wait for DB update and verify via peek helper
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for DB update
    
    const peek = await request.get(`/api/test/peek-registration?tracking_code=${encodeURIComponent(registrationId)}`, {
      headers: getTestHeaders(),
    });
    expect(peek.status()).toBe(200);
    const peekJson = await peek.json();
    
    // Step 5: Assert via peek - target dimension changed to needs_update
    expect(peekJson.profile_review_status).toBe('needs_update');
    
    // Step 6: Assert global status matches waiting_for_update pattern (generic or specific)
    expect(peekJson.status).toMatch(/^waiting_for_update/);
    
    // Step 7: Verify email was queued via email stub
    const emailRes = await request.get('/api/test/get-pending-emails', {
      headers: getTestHeaders(),
    });
    expect(emailRes.ok()).toBeTruthy();
    const emailData = await emailRes.json();
    
    // Assert at least one email was queued
    expect(emailData.success).toBeTruthy();
    expect(emailData.count).toBeGreaterThan(0);
    
    // Find email related to update request (check template or subject)
    const updateEmails = emailData.emails.filter((email: any) => 
      email.template && email.template.toLowerCase().includes('update')
    );
    expect(updateEmails.length).toBeGreaterThan(0);
    
    console.log(`✅ AC2 test passed: ${registrationId} - profile marked needs_update, global status: ${peekJson.status}, emails queued: ${emailData.count}`);
  });

  test('negative tests: unauthorized access, invalid dimension, missing fields', async ({ request }) => {
    // Test 1: Call without auth should return 401
    const unauthorizedRes = await request.post('/api/test/request-update', {
      data: {
        registrationId: 'YEC-1234567890-test',
        dimension: 'profile'
      }
    });
    expect(unauthorizedRes.status()).toBe(401);

    // Test 2: Invalid dimension should return 400
    const invalidDimensionRes = await request.post('/api/test/request-update', {
      headers: getTestHeaders(),
      data: {
        registrationId: 'YEC-1234567890-test',
        dimension: 'invalid'
      }
    });
    expect(invalidDimensionRes.status()).toBe(400);
    const invalidDimensionData = await invalidDimensionRes.json();
    expect(invalidDimensionData.error).toContain('Invalid dimension');

    // Test 3: Missing dimension should return 400
    const missingDimensionRes = await request.post('/api/test/request-update', {
      headers: getTestHeaders(),
      data: {
        registrationId: 'YEC-1234567890-test'
      }
    });
    expect(missingDimensionRes.status()).toBe(400);
    const missingDimensionData = await missingDimensionRes.json();
    expect(missingDimensionData.error).toContain('Invalid dimension');

    // Test 4: Missing registrationId should return 400
    const missingIdRes = await request.post('/api/test/request-update', {
      headers: getTestHeaders(),
      data: {
        dimension: 'profile'
      }
    });
    expect(missingIdRes.status()).toBe(400);
    const missingIdData = await missingIdRes.json();
    expect(missingIdData.error).toContain('registrationId is required');
  });
});


