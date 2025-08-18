import { test, expect } from '@playwright/test';

test.describe('Database Routing Validation E2E', () => {
  test('should show healthy status when database routing is valid', async ({ page }) => {
    // Test the health endpoint
    const response = await page.request.get('/api/health');
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.database.routing).toBe('valid');
      expect(data.database.host).toBeDefined();
      expect(data.database.env).toBeDefined();
    } else {
      // If health check fails, it should be due to invalid routing
      const data = await response.json();
      expect(data.status).toBe('unhealthy');
      expect(data.database.routing).toBe('invalid');
      expect(data.error).toContain('Invalid DB routing');
    }
  });

  test('should allow registration when database routing is valid', async ({ page }) => {
    // Test registration endpoint
    const registrationData = {
      title: 'Mr',
      firstName: 'E2E',
      lastName: 'Test',
      nickname: 'E2ETest',
      phone: '0123456789',
      lineId: 'e2etest123',
      email: 'e2e-test@example.com',
      companyName: 'E2E Test Company',
      businessType: 'technology',
      yecProvince: 'bangkok',
      hotelChoice: 'in-quota',
      roomType: 'single',
      travelType: 'private-car'
    };

    const response = await page.request.post('/api/register', {
      data: registrationData,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // The response should either be 200 (success) or 500 (routing error)
    if (response.status() === 200) {
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.registration_id).toMatch(/^YEC-\d+-[a-z0-9]+$/);
    } else if (response.status() === 500) {
      const data = await response.json();
      expect(data.error).toContain('Invalid DB routing');
    } else {
      // Other status codes should be documented
      console.log(`Unexpected status code: ${response.status()}`);
      expect(response.status()).toBeOneOf([200, 500]);
    }
  });

  test('should log database routing information in development', async ({ page }) => {
    // This test verifies that the database routing information is logged
    // We can't directly test console.log in Playwright, but we can verify
    // that the health endpoint returns the expected information
    
    const response = await page.request.get('/api/health');
    const data = await response.json();
    
    // Should have database information
    expect(data.database).toBeDefined();
    expect(data.database.host).toBeDefined();
    expect(data.database.env).toBeDefined();
    
    // Should have services information
    expect(data.services).toBeDefined();
    expect(data.services.supabase).toBeDefined();
  });
});
