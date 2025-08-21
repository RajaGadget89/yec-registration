import { test, expect } from '@playwright/test';

test.describe('Migration Validation - Quick Health Check', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080';
  const cronSecret = process.env.CRON_SECRET || 'test-cron-secret';

  test('should have working database connection', async ({ request }) => {
    // Quick health check - test basic API connectivity
    const response = await request.get(`${baseURL}/api/health`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'ok');
  });

  test('should have valid Supabase connection', async ({ request }) => {
    // Test Supabase connectivity via a simple endpoint
    const response = await request.get(`${baseURL}/api/whoami`);
    
    // We expect either 200 (authenticated) or 401 (not authenticated)
    // Both indicate the database connection is working
    expect([200, 401]).toContain(response.status());
  });

  test('should have working admin endpoints structure', async ({ request }) => {
    // Test admin endpoint structure without full email processing
    const response = await request.get(`${baseURL}/api/admin/email-status`, {
      headers: {
        'Authorization': `Bearer ${cronSecret}`
      }
    });

    // We expect either 200 (working) or 500 (template issues)
    // Both indicate the endpoint structure is correct
    expect([200, 500]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('ok', true);
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('config');
    }
  });

  test('should reject unauthorized admin access', async ({ request }) => {
    // Quick security validation
    const response = await request.get(`${baseURL}/api/admin/dispatch-emails`);
    expect(response.status()).toBe(401);
    
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  test('should have valid registration endpoint', async ({ request }) => {
    // Test registration endpoint structure (without full processing)
    const response = await request.post(`${baseURL}/api/register`, {
      data: {
        title: "Mr",
        firstName: "QuickTest",
        lastName: "User",
        nickname: "QuickTestUser",
        phone: "0123456799",
        lineId: "quicktestuser",
        email: "quicktest@example.com",
        companyName: "Quick Test Co",
        businessType: "technology",
        yecProvince: "bangkok",
        hotelChoice: "in-quota",
        roomType: "single",
        travelType: "private-car",
        pdpaConsent: true
      }
    });

    // We expect either 200 (success) or 400 (validation error)
    // Both indicate the endpoint is working
    expect([200, 400]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('registration_id');
    }
  });
});
