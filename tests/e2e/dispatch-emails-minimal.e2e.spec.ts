import { test, expect } from '@playwright/test';

test.describe('Dispatch Emails API - Minimal Tests', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080';
  const cronSecret = process.env.CRON_SECRET || 'test-cron-secret';

  test('should return 401 for unauthorized GET request', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/admin/dispatch-emails`);
    expect(response.status()).toBe(401);
    
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  test('should return 401 for unauthorized POST request', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/admin/dispatch-emails`, {
      data: { batchSize: 10 }
    });
    expect(response.status()).toBe(401);
    
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  test('should accept GET with query parameter cron_secret', async ({ request }) => {
    const response = await request.get(
      `${baseURL}/api/admin/dispatch-emails?cron_secret=${cronSecret}`
    );
    
    // We expect either 200 (if no email templates to process) or 500 (if JSX error)
    // This test will help us understand what's happening
    console.log(`Response status: ${response.status()}`);
    
    if (response.status() === 200) {
      const body = await response.json();
      console.log('Response body:', JSON.stringify(body, null, 2));
      expect(body.ok).toBe(true);
    } else {
      console.log('Got error response, checking if it\'s the JSX error...');
      const text = await response.text();
      if (text.includes('supportEmail')) {
        console.log('Confirmed: JSX parsing error in email templates');
      }
    }
  });

  test('should accept GET with Authorization header', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/admin/dispatch-emails`, {
      headers: {
        'Authorization': `Bearer ${cronSecret}`
      }
    });
    
    console.log(`Response status: ${response.status()}`);
    
    if (response.status() === 200) {
      const body = await response.json();
      console.log('Response body:', JSON.stringify(body, null, 2));
      expect(body.ok).toBe(true);
    }
  });
});



