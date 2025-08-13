import { test, expect } from '@playwright/test';

test.describe('Dispatch Emails API - Comprehensive Tests', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080';
  const cronSecret = process.env.CRON_SECRET || 'test-cron-secret';

  test.describe('Unauthorized Access', () => {
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

    test('should return 401 for GET with invalid Authorization header', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/admin/dispatch-emails`, {
        headers: {
          'Authorization': 'Bearer invalid-secret'
        }
      });
      expect(response.status()).toBe(401);
      
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    test('should return 401 for GET with invalid query parameter', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/admin/dispatch-emails?cron_secret=invalid-secret`);
      expect(response.status()).toBe(401);
      
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    test('should return 401 for GET with invalid custom header', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/admin/dispatch-emails`, {
        headers: {
          'x-cron-secret': 'invalid-secret'
        }
      });
      expect(response.status()).toBe(401);
      
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });
  });

  test.describe('Authorized GET Requests', () => {
    test('should accept GET with query parameter cron_secret and return 200', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/admin/dispatch-emails?cron_secret=${cronSecret}`
      );
      
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(body.dryRun).toBe(true); // Should be true due to DISPATCH_DRY_RUN=true
      expect(body.sent).toBe(0); // Should be 0 in dry-run mode
      expect(typeof body.wouldSend).toBe('number');
      expect(typeof body.errors).toBe('number');
      expect(typeof body.remaining).toBe('number');
      expect(typeof body.timestamp).toBe('string');
      expect(new Date(body.timestamp)).toBeInstanceOf(Date);
    });

    test('should accept GET with Authorization header and return 200', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/admin/dispatch-emails`, {
        headers: {
          'Authorization': `Bearer ${cronSecret}`
        }
      });
      
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(body.dryRun).toBe(true);
      expect(body.sent).toBe(0);
      expect(typeof body.wouldSend).toBe('number');
      expect(typeof body.errors).toBe('number');
      expect(typeof body.remaining).toBe('number');
      expect(typeof body.timestamp).toBe('string');
    });

    test('should accept GET with custom header x-cron-secret and return 200', async ({ request }) => {
      const response = await request.get(`${baseURL}/api/admin/dispatch-emails`, {
        headers: {
          'x-cron-secret': cronSecret
        }
      });
      
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(body.dryRun).toBe(true);
      expect(body.sent).toBe(0);
      expect(typeof body.wouldSend).toBe('number');
      expect(typeof body.errors).toBe('number');
      expect(typeof body.remaining).toBe('number');
      expect(typeof body.timestamp).toBe('string');
    });

    test('should handle dry_run query parameter override', async ({ request }) => {
      const response = await request.get(
        `${baseURL}/api/admin/dispatch-emails?cron_secret=${cronSecret}&dry_run=true`
      );
      
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(body.dryRun).toBe(true);
      expect(body.sent).toBe(0);
      expect(typeof body.wouldSend).toBe('number');
    });
  });

  test.describe('Authorized POST Requests', () => {
    test('should accept POST with Authorization header and return 200', async ({ request }) => {
      const response = await request.post(`${baseURL}/api/admin/dispatch-emails`, {
        headers: {
          'Authorization': `Bearer ${cronSecret}`
        },
        data: { batchSize: 25 }
      });
      
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(body.dryRun).toBe(true);
      expect(body.sent).toBe(0);
      expect(typeof body.wouldSend).toBe('number');
      expect(typeof body.errors).toBe('number');
      expect(typeof body.remaining).toBe('number');
      expect(typeof body.timestamp).toBe('string');
    });

    test('should accept POST with custom header and return 200', async ({ request }) => {
      const response = await request.post(`${baseURL}/api/admin/dispatch-emails`, {
        headers: {
          'x-cron-secret': cronSecret
        },
        data: { batchSize: 10 }
      });
      
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(body.dryRun).toBe(true);
      expect(body.sent).toBe(0);
      expect(typeof body.wouldSend).toBe('number');
    });

    test('should handle dryRun in request body', async ({ request }) => {
      const response = await request.post(`${baseURL}/api/admin/dispatch-emails`, {
        headers: {
          'Authorization': `Bearer ${cronSecret}`
        },
        data: { 
          batchSize: 15,
          dryRun: true
        }
      });
      
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(body.dryRun).toBe(true);
      expect(body.sent).toBe(0);
      expect(typeof body.wouldSend).toBe('number');
    });

    test('should validate batch size limits', async ({ request }) => {
      // Test minimum batch size
      const response1 = await request.post(`${baseURL}/api/admin/dispatch-emails`, {
        headers: {
          'Authorization': `Bearer ${cronSecret}`
        },
        data: { batchSize: 0 }
      });
      
      expect(response1.status()).toBe(400);
      
      const body1 = await response1.json();
      expect(body1.error).toBe('Invalid batch size');
      expect(body1.message).toBe('Batch size must be between 1 and 100');

      // Test maximum batch size
      const response2 = await request.post(`${baseURL}/api/admin/dispatch-emails`, {
        headers: {
          'Authorization': `Bearer ${cronSecret}`
        },
        data: { batchSize: 101 }
      });
      
      expect(response2.status()).toBe(400);
      
      const body2 = await response2.json();
      expect(body2.error).toBe('Invalid batch size');
      expect(body2.message).toBe('Batch size must be between 1 and 100');
    });

    test('should handle empty request body gracefully', async ({ request }) => {
      const response = await request.post(`${baseURL}/api/admin/dispatch-emails`, {
        headers: {
          'Authorization': `Bearer ${cronSecret}`
        }
      });
      
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(body.dryRun).toBe(true);
      expect(body.sent).toBe(0);
      expect(typeof body.wouldSend).toBe('number');
    });
  });

  test.describe('Idempotency and Consistency', () => {
    test('should maintain idempotency in dry-run mode', async ({ request }) => {
      // First request
      const response1 = await request.get(
        `${baseURL}/api/admin/dispatch-emails?cron_secret=${cronSecret}`
      );
      
      expect(response1.status()).toBe(200);
      const body1 = await response1.json();
      expect(body1.sent).toBe(0);
      const wouldSend1 = body1.wouldSend;

      // Second request (should be idempotent)
      const response2 = await request.get(
        `${baseURL}/api/admin/dispatch-emails?cron_secret=${cronSecret}`
      );
      
      expect(response2.status()).toBe(200);
      const body2 = await response2.json();
      expect(body2.sent).toBe(0);
      const wouldSend2 = body2.wouldSend;

      // In dry-run mode, wouldSend should be consistent
      expect(wouldSend2).toBe(wouldSend1);
    });

    test('should return consistent JSON structure across all methods', async ({ request }) => {
      // Test GET
      const getResponse = await request.get(
        `${baseURL}/api/admin/dispatch-emails?cron_secret=${cronSecret}`
      );
      expect(getResponse.status()).toBe(200);
      const getBody = await getResponse.json();
      
      // Test POST
      const postResponse = await request.post(`${baseURL}/api/admin/dispatch-emails`, {
        headers: {
          'Authorization': `Bearer ${cronSecret}`
        },
        data: { batchSize: 20 }
      });
      expect(postResponse.status()).toBe(200);
      const postBody = await postResponse.json();

      // Both should have the same structure
      const expectedKeys = ['ok', 'dryRun', 'sent', 'wouldSend', 'errors', 'remaining', 'timestamp'];
      
      for (const key of expectedKeys) {
        expect(getBody).toHaveProperty(key);
        expect(postBody).toHaveProperty(key);
      }

      // Both should be in dry-run mode
      expect(getBody.dryRun).toBe(true);
      expect(postBody.dryRun).toBe(true);
      
      // Both should have sent=0 in dry-run mode
      expect(getBody.sent).toBe(0);
      expect(postBody.sent).toBe(0);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle malformed JSON in POST body', async ({ request }) => {
      const response = await request.post(`${baseURL}/api/admin/dispatch-emails`, {
        headers: {
          'Authorization': `Bearer ${cronSecret}`,
          'Content-Type': 'application/json'
        },
        data: 'invalid json'
      });
      
      // Should still work with default values
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(body.dryRun).toBe(true);
    });

    test('should handle missing CRON_SECRET environment variable gracefully', async ({ request }) => {
      // This test documents the expected behavior when CRON_SECRET is not set
      // In a real scenario, this would be caught by the environment setup
      const response = await request.get(`${baseURL}/api/admin/dispatch-emails`);
      expect(response.status()).toBe(401);
      
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });
  });
});

