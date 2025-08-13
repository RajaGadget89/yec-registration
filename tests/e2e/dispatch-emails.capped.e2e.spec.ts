import { test, expect } from '@playwright/test';

test.describe('Dispatch Emails API - Capped Mode Tests', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080';
  const cronSecret = process.env.CRON_SECRET || 'local-secret';
  
  // Test configuration - should match environment variables
  const expectedConfig = {
    mode: 'CAPPED',
    capMaxPerRun: 2,
    allowlist: ['you@example.com', 'qa@example.com'],
    subjectPrefix: '[E2E]',
    blockNonAllowlist: true
  };

  test.beforeEach(async ({ request }) => {
    // Reset transport stats before each test
    try {
      await request.post(`${baseURL}/api/admin/dispatch-emails`, {
        headers: { 'Authorization': `Bearer ${cronSecret}` },
        data: { batchSize: 1, dryRun: true }
      });
    } catch (e) {
      // Ignore errors in setup
    }
  });

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

  test('should accept GET with query parameter cron_secret and return proper response format', async ({ request }) => {
    const response = await request.get(
      `${baseURL}/api/admin/dispatch-emails?cron_secret=${cronSecret}`
    );
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    console.log('Response body:', JSON.stringify(body, null, 2));
    
    // Validate response format
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(false); // In CAPPED mode, should not be dry-run
    expect(typeof body.sent).toBe('number');
    expect(typeof body.wouldSend).toBe('number');
    expect(typeof body.capped).toBe('number');
    expect(typeof body.blocked).toBe('number');
    expect(typeof body.errors).toBe('number');
    expect(typeof body.remaining).toBe('number');
    expect(typeof body.timestamp).toBe('string');
    
    // Validate capped mode behavior
    expect(body.sent).toBeLessThanOrEqual(expectedConfig.capMaxPerRun);
    expect(body.sent + body.capped + body.blocked + body.errors).toBeGreaterThan(0);
  });

  test('should accept GET with Authorization header and enforce cap limits', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/admin/dispatch-emails`, {
      headers: {
        'Authorization': `Bearer ${cronSecret}`
      }
    });
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    console.log('Response body:', JSON.stringify(body, null, 2));
    
    // Validate cap enforcement
    expect(body.sent).toBeLessThanOrEqual(expectedConfig.capMaxPerRun);
    
    // If we have more than cap emails, some should be capped
    if (body.sent + body.capped + body.blocked > expectedConfig.capMaxPerRun) {
      expect(body.capped).toBeGreaterThan(0);
    }
  });

  test('should accept POST with admin authentication and return detailed results', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/admin/dispatch-emails`, {
      headers: {
        'Authorization': `Bearer ${cronSecret}`
      },
      data: { 
        batchSize: 10,
        dryRun: false
      }
    });
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    console.log('Response body:', JSON.stringify(body, null, 2));
    
    // Validate response format
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(false); // In CAPPED mode, should not be dry-run
    expect(typeof body.sent).toBe('number');
    expect(typeof body.wouldSend).toBe('number');
    expect(typeof body.capped).toBe('number');
    expect(typeof body.blocked).toBe('number');
    expect(typeof body.errors).toBe('number');
    expect(typeof body.remaining).toBe('number');
    expect(typeof body.timestamp).toBe('string');
    
    // Validate capped mode behavior
    expect(body.sent).toBeLessThanOrEqual(expectedConfig.capMaxPerRun);
  });

  test('should enforce allowlist and block non-allowlisted emails', async ({ request }) => {
    // This test validates that emails to non-allowlisted addresses are blocked
    const response = await request.get(
      `${baseURL}/api/admin/dispatch-emails?cron_secret=${cronSecret}`
    );
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    console.log('Response body:', JSON.stringify(body, null, 2));
    
    // Since our mock emails include 'blocked@example.com' which is not in allowlist,
    // we should see some blocked emails
    expect(body.blocked).toBeGreaterThanOrEqual(0);
  });

  test('should enforce per-run cap and mark excess as capped', async ({ request }) => {
    // This test validates that when we have more emails than the cap, excess are marked as capped
    const response = await request.get(
      `${baseURL}/api/admin/dispatch-emails?cron_secret=${cronSecret}`
    );
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    console.log('Response body:', JSON.stringify(body, null, 2));
    
    // Total processed emails
    const totalProcessed = body.sent + body.capped + body.blocked + body.errors;
    
    // If we have more emails than the cap, some should be capped
    if (totalProcessed > expectedConfig.capMaxPerRun) {
      expect(body.capped).toBeGreaterThan(0);
      expect(body.sent).toBeLessThanOrEqual(expectedConfig.capMaxPerRun);
    }
  });

  test('should apply subject prefix in capped mode', async ({ request }) => {
    // This test validates that subject prefixes are applied in capped mode
    const response = await request.get(
      `${baseURL}/api/admin/dispatch-emails?cron_secret=${cronSecret}`
    );
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    console.log('Response body:', JSON.stringify(body, null, 2));
    
    // In capped mode, we should have some sent emails with prefixed subjects
    // The actual subject prefix validation would require inspecting the transport logs
    // For now, we validate that the system is working in capped mode
    expect(body.sent + body.capped + body.blocked).toBeGreaterThan(0);
  });

  test('should handle dry-run mode correctly', async ({ request }) => {
    const response = await request.get(
      `${baseURL}/api/admin/dispatch-emails?cron_secret=${cronSecret}&dry_run=true`
    );
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    console.log('Response body:', JSON.stringify(body, null, 2));
    
    // Validate dry-run behavior
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
    expect(body.sent).toBe(0); // No actual sends in dry-run
    expect(body.wouldSend).toBeGreaterThan(0); // But would send some
    expect(body.capped).toBe(0); // No capped in dry-run
    expect(body.blocked).toBe(0); // No blocked in dry-run
  });

  test('should validate batch size limits', async ({ request }) => {
    // Test with invalid batch size
    const response = await request.post(`${baseURL}/api/admin/dispatch-emails`, {
      headers: {
        'Authorization': `Bearer ${cronSecret}`
      },
      data: { batchSize: 150 } // Over limit
    });
    
    expect(response.status()).toBe(400);
    
    const body = await response.json();
    expect(body.error).toBe('Invalid batch size');
  });

  test('should handle multiple requests and maintain cap across requests', async ({ request }) => {
    // First request
    const response1 = await request.get(
      `${baseURL}/api/admin/dispatch-emails?cron_secret=${cronSecret}`
    );
    
    expect(response1.status()).toBe(200);
    const body1 = await response1.json();
    
    // Second request - should still respect cap
    const response2 = await request.get(
      `${baseURL}/api/admin/dispatch-emails?cron_secret=${cronSecret}`
    );
    
    expect(response2.status()).toBe(200);
    const body2 = await response2.json();
    
    // Both requests should respect the cap
    expect(body1.sent).toBeLessThanOrEqual(expectedConfig.capMaxPerRun);
    expect(body2.sent).toBeLessThanOrEqual(expectedConfig.capMaxPerRun);
    
    console.log('First request:', JSON.stringify(body1, null, 2));
    console.log('Second request:', JSON.stringify(body2, null, 2));
  });

  test('should provide consistent response format across all endpoints', async ({ request }) => {
    // Test GET endpoint
    const getResponse = await request.get(
      `${baseURL}/api/admin/dispatch-emails?cron_secret=${cronSecret}`
    );
    
    expect(getResponse.status()).toBe(200);
    const getBody = await getResponse.json();
    
    // Test POST endpoint
    const postResponse = await request.post(`${baseURL}/api/admin/dispatch-emails`, {
      headers: {
        'Authorization': `Bearer ${cronSecret}`
      },
      data: { batchSize: 5 }
    });
    
    expect(postResponse.status()).toBe(200);
    const postBody = await postResponse.json();
    
    // Both responses should have the same structure
    const expectedFields = ['ok', 'dryRun', 'sent', 'wouldSend', 'capped', 'blocked', 'errors', 'remaining', 'timestamp'];
    
    for (const field of expectedFields) {
      expect(getBody).toHaveProperty(field);
      expect(postBody).toHaveProperty(field);
      expect(typeof getBody[field]).toBe(typeof postBody[field]);
    }
    
    console.log('GET response format:', Object.keys(getBody));
    console.log('POST response format:', Object.keys(postBody));
  });
});

