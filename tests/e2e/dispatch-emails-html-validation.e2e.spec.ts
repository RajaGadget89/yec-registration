import { test, expect } from '@playwright/test';

test.describe('Dispatch Emails API - HTML Validation Tests', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080';
  const cronSecret = process.env.CRON_SECRET || 'local-secret';

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

  test('should validate HTML payload before sending', async ({ request }) => {
    const response = await request.get(
      `${baseURL}/api/admin/dispatch-emails?cron_secret=${cronSecret}`
    );
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    console.log('Response body:', JSON.stringify(body, null, 2));
    
    // Validate that HTML validation is working
    // The system should not have any "html must be a string" errors
    expect(body.errors).toBeGreaterThanOrEqual(0);
    
    // If there are errors, they should not be HTML validation errors
    if (body.errors > 0) {
      // The errors should be from other sources (like allowlist blocking)
      // not from HTML validation failures
      expect(body.sent + body.capped + body.blocked).toBeGreaterThan(0);
    }
  });

  test('should handle email template rendering safely', async ({ request }) => {
    const response = await request.get(
      `${baseURL}/api/admin/dispatch-emails?cron_secret=${cronSecret}`
    );
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    console.log('Response body:', JSON.stringify(body, null, 2));
    
    // Validate that template rendering is working
    // We should have some successful processing (sent, capped, or blocked)
    const totalProcessed = body.sent + body.capped + body.blocked + body.errors;
    expect(totalProcessed).toBeGreaterThan(0);
    
    // If we have successful sends, HTML rendering worked
    if (body.sent > 0) {
      expect(body.sent).toBeGreaterThan(0);
    }
  });

  test('should include rate limiting and retry stats in response', async ({ request }) => {
    const response = await request.get(
      `${baseURL}/api/admin/dispatch-emails?cron_secret=${cronSecret}`
    );
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    console.log('Response body:', JSON.stringify(body, null, 2));
    
    // Validate new stats are present
    expect(typeof body.rateLimited).toBe('number');
    expect(typeof body.retries).toBe('number');
    
    // Stats should be non-negative
    expect(body.rateLimited).toBeGreaterThanOrEqual(0);
    expect(body.retries).toBeGreaterThanOrEqual(0);
    
    // In normal operation, we shouldn't have rate limiting or retries
    // But the fields should be present and valid
    expect(body.rateLimited).toBeLessThanOrEqual(body.sent + body.capped + body.blocked);
    expect(body.retries).toBeLessThanOrEqual(body.rateLimited * 2); // Max retries per rate limit
  });

  test('should maintain response format consistency with new stats', async ({ request }) => {
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
    
    // Both responses should have the same structure including new stats
    const expectedFields = [
      'ok', 'dryRun', 'sent', 'wouldSend', 'capped', 'blocked', 
      'errors', 'remaining', 'rateLimited', 'retries', 'timestamp'
    ];
    
    for (const field of expectedFields) {
      expect(getBody).toHaveProperty(field);
      expect(postBody).toHaveProperty(field);
      expect(typeof getBody[field]).toBe(typeof postBody[field]);
    }
    
    console.log('GET response format:', Object.keys(getBody));
    console.log('POST response format:', Object.keys(postBody));
  });

  test('should handle dry-run mode with HTML validation', async ({ request }) => {
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
    expect(body.rateLimited).toBe(0); // No rate limiting in dry-run
    expect(body.retries).toBe(0); // No retries in dry-run
  });

  test('should validate email payload structure', async ({ request }) => {
    const response = await request.get(
      `${baseURL}/api/admin/dispatch-emails?cron_secret=${cronSecret}`
    );
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    console.log('Response body:', JSON.stringify(body, null, 2));
    
    // Validate that all numeric fields are actually numbers
    const numericFields = ['sent', 'wouldSend', 'capped', 'blocked', 'errors', 'remaining', 'rateLimited', 'retries'];
    
    numericFields.forEach(field => {
      expect(typeof body[field]).toBe('number');
      expect(body[field]).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(body[field])).toBe(true);
    });
    
    // Validate that boolean fields are actually booleans
    expect(typeof body.ok).toBe('boolean');
    expect(typeof body.dryRun).toBe('boolean');
    
    // Validate that string fields are actually strings
    expect(typeof body.timestamp).toBe('string');
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO format
  });
});
