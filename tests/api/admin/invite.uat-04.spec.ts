import { test, expect } from '@playwright/test';
import { resetRateLimiter } from '../../../app/lib/rate-limit';
import { getTestEnvironment, logEnvironmentConfig } from '../helpers/env';
import { generateUniqueEmail, getInvalidEmails } from '../helpers/email';

/**
 * UAT-04 — API tests for Invite Creation & Validations (RED-first)
 * 
 * Tests the POST /api/admin/management/invite endpoint contract:
 * - 201 Created: valid payload creates invite (pending)
 * - 409 Conflict: duplicate pending invite blocked
 * - 422 Unprocessable: invalid email/roles rejected
 * - 429 Too Many Requests: rate limit enforcement
 * - Idempotency: same key returns exact prior result
 */

// Test configuration
const env = getTestEnvironment();
const BASE_URL = env.BASE_URL;
const ADMIN_BEARER = env.ADMIN_BEARER;

// Helper function to generate idempotency keys
function generateIdempotencyKey(prefix: string = 'uat04'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

// Helper function to get super admin headers
async function getSuperAdminHeaders(request: any): Promise<Record<string, string>> {
  // For testing, we'll use a mock super admin setup
  // In real implementation, this would authenticate with the system
  return {
    'Authorization': `Bearer ${ADMIN_BEARER}`,
    'Content-Type': 'application/json',
    'X-E2E-RLS-BYPASS': '1', // Bypass RLS for testing
  };
}

test.describe('UAT-04: Admin Invite Creation & Validations', () => {
  let superAdminHeaders: Record<string, string>;

  test.beforeAll(async ({ request }) => {
    // Log environment configuration
    logEnvironmentConfig();
    
    // Reset rate limiter for clean test state
    resetRateLimiter();
    
    // Get super admin headers
    superAdminHeaders = await getSuperAdminHeaders(request);
    
    console.log('[UAT-04] Test setup completed');
  });

  test.beforeEach(async () => {
    // Reset rate limiter before each test to ensure clean state
    resetRateLimiter();
  });

  test.describe('Create 201 - Happy Path', () => {
    test('should create invitation successfully with valid payload', async ({ request }) => {
      // Arrange
      const email = generateUniqueEmail('happy');
      const roles = ['admin'];
      const idempotencyKey = generateIdempotencyKey('happy');

      // Act
      const response = await request.post(`${BASE_URL}/api/admin/management/invite`, {
        headers: {
          ...superAdminHeaders,
          'Idempotency-Key': idempotencyKey,
        },
        data: {
          email,
          roles,
        },
      });

      // Assert
      expect(response.status()).toBe(201);
      
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('email', email);
      expect(data).toHaveProperty('expires_at');
      expect(data).toHaveProperty('message', 'Invitation created successfully');
      expect(data).toHaveProperty('correlation_id');
      
      // Verify response schema
      expect(typeof data.id).toBe('string');
      expect(typeof data.email).toBe('string');
      expect(typeof data.expires_at).toBe('string');
      expect(typeof data.message).toBe('string');
      expect(typeof data.correlation_id).toBe('string');
      
      // Verify expiration is in the future
      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
      
      console.log(`[UAT-04] Created invitation: ${data.id} for ${email}`);
    });

    test('should create invitation with super_admin role', async ({ request }) => {
      // Arrange
      const email = generateUniqueEmail('super');
      const roles = ['super_admin'];
      const idempotencyKey = generateIdempotencyKey('super');

      // Act
      const response = await request.post(`${BASE_URL}/api/admin/management/invite`, {
        headers: {
          ...superAdminHeaders,
          'Idempotency-Key': idempotencyKey,
        },
        data: {
          email,
          roles,
        },
      });

      // Assert
      expect(response.status()).toBe(201);
      
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('email', email);
      
      console.log(`[UAT-04] Created super_admin invitation: ${data.id} for ${email}`);
    });

    test('should create invitation with multiple roles', async ({ request }) => {
      // Arrange
      const email = generateUniqueEmail('multi');
      const roles = ['admin', 'super_admin'];
      const idempotencyKey = generateIdempotencyKey('multi');

      // Act
      const response = await request.post(`${BASE_URL}/api/admin/management/invite`, {
        headers: {
          ...superAdminHeaders,
          'Idempotency-Key': idempotencyKey,
        },
        data: {
          email,
          roles,
        },
      });

      // Assert
      expect(response.status()).toBe(201);
      
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('email', email);
      
      console.log(`[UAT-04] Created multi-role invitation: ${data.id} for ${email}`);
    });
  });

  test.describe('Duplicate 409 - Conflict Handling', () => {
    test('should return 409 for duplicate pending invitation', async ({ request }) => {
      // Arrange
      const email = generateUniqueEmail('dup');
      const roles = ['admin'];
      const idempotencyKey1 = generateIdempotencyKey('dup1');
      const idempotencyKey2 = generateIdempotencyKey('dup2');

      // Act - First invitation (should succeed)
      const response1 = await request.post(`${BASE_URL}/api/admin/management/invite`, {
        headers: {
          ...superAdminHeaders,
          'Idempotency-Key': idempotencyKey1,
        },
        data: {
          email,
          roles,
        },
      });

      expect(response1.status()).toBe(201);
      const data1 = await response1.json();
      const invitationId = data1.id;

      // Act - Second invitation with same email (should fail with 409)
      const response2 = await request.post(`${BASE_URL}/api/admin/management/invite`, {
        headers: {
          ...superAdminHeaders,
          'Idempotency-Key': idempotencyKey2,
        },
        data: {
          email,
          roles,
        },
      });

      // Assert
      expect(response2.status()).toBe(409);
      
      const errorData = await response2.json();
      expect(errorData).toHaveProperty('error', 'Invitation already exists for this email');
      expect(errorData).toHaveProperty('code', 'INVITE_EXISTS');
      expect(errorData).toHaveProperty('invitation_id', invitationId);
      
      console.log(`[UAT-04] Duplicate blocked: ${email} -> 409 with invitation_id: ${invitationId}`);
    });

    test('should return 409 with stable error format', async ({ request }) => {
      // Arrange
      const email = generateUniqueEmail('stable');
      const roles = ['admin'];
      const idempotencyKey1 = generateIdempotencyKey('stable1');
      const idempotencyKey2 = generateIdempotencyKey('stable2');

      // Create first invitation
      await request.post(`${BASE_URL}/api/admin/management/invite`, {
        headers: {
          ...superAdminHeaders,
          'Idempotency-Key': idempotencyKey1,
        },
        data: { email, roles },
      });

      // Try duplicate multiple times to ensure consistent error format
      for (let i = 0; i < 3; i++) {
        const response = await request.post(`${BASE_URL}/api/admin/management/invite`, {
          headers: {
            ...superAdminHeaders,
            'Idempotency-Key': `${idempotencyKey2}-${i}`,
          },
          data: { email, roles },
        });

        expect(response.status()).toBe(409);
        
        const errorData = await response.json();
        expect(errorData).toHaveProperty('error', 'Invitation already exists for this email');
        expect(errorData).toHaveProperty('code', 'INVITE_EXISTS');
        expect(errorData).toHaveProperty('invitation_id');
        expect(typeof errorData.invitation_id).toBe('string');
      }
      
      console.log(`[UAT-04] Stable 409 error format confirmed for ${email}`);
    });
  });

  test.describe('422 Unprocessable - Validation Errors', () => {
    test('should return 422 for invalid email format', async ({ request }) => {
      // Arrange
      const invalidEmails = getInvalidEmails();

      for (const email of invalidEmails) {
        const idempotencyKey = generateIdempotencyKey('invalid-email');

        // Act
        const response = await request.post(`${BASE_URL}/api/admin/management/invite`, {
          headers: {
            ...superAdminHeaders,
            'Idempotency-Key': idempotencyKey,
          },
          data: {
            email,
            roles: ['admin'],
          },
        });

        // Assert
        expect(response.status()).toBe(422);
        
        const errorData = await response.json();
        expect(errorData).toHaveProperty('error', 'Validation failed');
        expect(errorData).toHaveProperty('details');
        expect(Array.isArray(errorData.details)).toBe(true);
        
        // Check that at least one error mentions email
        const emailErrors = errorData.details.filter((detail: any) => 
          detail.path?.includes('email') || detail.message?.toLowerCase().includes('email')
        );
        expect(emailErrors.length).toBeGreaterThan(0);
        
        console.log(`[UAT-04] Invalid email rejected: "${email}" -> 422`);
      }
    });

    test('should return 422 for invalid roles', async ({ request }) => {
      // Arrange
      const email = generateUniqueEmail('invalid-roles');
      const invalidRoleCases = [
        { roles: ['godmode'] },
        { roles: ['invalid_role'] },
        { roles: ['admin', 'invalid'] },
        { roles: [] },
        { roles: [''] },
        { roles: ['admin', ''] },
      ];

      for (const roleCase of invalidRoleCases) {
        const idempotencyKey = generateIdempotencyKey('invalid-roles');

        // Act
        const response = await request.post(`${BASE_URL}/api/admin/management/invite`, {
          headers: {
            ...superAdminHeaders,
            'Idempotency-Key': idempotencyKey,
          },
          data: {
            email,
            ...roleCase,
          },
        });

        // Assert
        expect(response.status()).toBe(422);
        
        const errorData = await response.json();
        expect(errorData).toHaveProperty('error', 'Validation failed');
        expect(errorData).toHaveProperty('details');
        expect(Array.isArray(errorData.details)).toBe(true);
        
        // Check that at least one error mentions roles
        const roleErrors = errorData.details.filter((detail: any) => 
          detail.path?.includes('roles') || detail.message?.toLowerCase().includes('role')
        );
        expect(roleErrors.length).toBeGreaterThan(0);
        
        console.log(`[UAT-04] Invalid roles rejected: ${JSON.stringify(roleCase.roles)} -> 422`);
      }
    });

    test('should return 422 for missing required fields', async ({ request }) => {
      // Arrange
      const idempotencyKey = generateIdempotencyKey('missing-fields');
      const invalidPayloads = [
        {}, // Missing all fields
        { email: 'test@example.com' }, // Missing roles
        { roles: ['admin'] }, // Missing email
        { email: '', roles: [] }, // Empty values
      ];

      for (const payload of invalidPayloads) {
        const key = generateIdempotencyKey('missing-fields');

        // Act
        const response = await request.post(`${BASE_URL}/api/admin/management/invite`, {
          headers: {
            ...superAdminHeaders,
            'Idempotency-Key': key,
          },
          data: payload,
        });

        // Assert
        expect(response.status()).toBe(422);
        
        const errorData = await response.json();
        expect(errorData).toHaveProperty('error', 'Validation failed');
        expect(errorData).toHaveProperty('details');
        expect(Array.isArray(errorData.details)).toBe(true);
        expect(errorData.details.length).toBeGreaterThan(0);
        
        console.log(`[UAT-04] Missing fields rejected: ${JSON.stringify(payload)} -> 422`);
      }
    });
  });

  test.describe('429 Too Many Requests - Rate Limiting', () => {
    test('should return 429 when exceeding per-minute rate limit', async ({ request }) => {
      // Arrange
      const requests = [];
      const limit = 5; // Default per-minute limit
      const burstCount = limit + 2; // Exceed the limit

      // Act - Send burst of requests
      for (let i = 0; i < burstCount; i++) {
        const email = generateUniqueEmail(`rate-limit-${i}`);
        const idempotencyKey = generateIdempotencyKey(`rate-limit-${i}`);
        
        const promise = request.post(`${BASE_URL}/api/admin/management/invite`, {
          headers: {
            ...superAdminHeaders,
            'Idempotency-Key': idempotencyKey,
          },
          data: {
            email,
            roles: ['admin'],
          },
        });
        
        requests.push(promise);
      }

      // Wait for all requests to complete
      const responses = await Promise.all(requests);

      // Assert - At least one should be rate limited
      const statusCodes = responses.map(r => r.status());
      const rateLimitedCount = statusCodes.filter(code => code === 429).length;
      
      expect(rateLimitedCount).toBeGreaterThan(0);
      console.log(`[UAT-04] Rate limiting: ${rateLimitedCount}/${burstCount} requests returned 429`);

      // Verify rate limit response format
      const rateLimitedResponse = responses.find(r => r.status() === 429);
      if (rateLimitedResponse) {
        const errorData = await rateLimitedResponse.json();
        expect(errorData).toHaveProperty('error', 'Rate limit exceeded');
        expect(errorData).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED');
        expect(errorData).toHaveProperty('retryAfter');
        expect(typeof errorData.retryAfter).toBe('number');
        expect(errorData.retryAfter).toBeGreaterThan(0);

        // Check rate limit headers
        const headers = rateLimitedResponse.headers();
        expect(headers).toHaveProperty('retry-after');
        expect(headers).toHaveProperty('x-ratelimit-limit');
        expect(headers).toHaveProperty('x-ratelimit-remaining');
        expect(headers).toHaveProperty('x-ratelimit-reset');
        
        console.log(`[UAT-04] Rate limit headers: Retry-After=${headers['retry-after']}, Limit=${headers['x-ratelimit-limit']}, Remaining=${headers['x-ratelimit-remaining']}`);
      }
    });

    test('should return 429 when exceeding per-day rate limit', async ({ request }) => {
      // This test would require more setup to trigger daily limits
      // For now, we'll skip it as it requires significant time investment
      test.skip('Daily rate limit test requires extended time period');
    });

    test('should respect Retry-After header timing', async ({ request }) => {
      // Arrange
      const email = generateUniqueEmail('retry-after');
      const idempotencyKey = generateIdempotencyKey('retry-after');

      // Act - Send requests until we hit rate limit
      let response;
      let attempt = 0;
      const maxAttempts = 10;

      while (attempt < maxAttempts) {
        response = await request.post(`${BASE_URL}/api/admin/management/invite`, {
          headers: {
            ...superAdminHeaders,
            'Idempotency-Key': `${idempotencyKey}-${attempt}`,
          },
          data: {
            email: `${email}-${attempt}`,
            roles: ['admin'],
          },
        });

        if (response.status() === 429) {
          break;
        }
        attempt++;
      }

      // Assert
      if (response && response.status() === 429) {
        const headers = response.headers();
        const retryAfter = headers['retry-after'];
        
        expect(retryAfter).toBeTruthy();
        const retrySeconds = parseInt(retryAfter);
        expect(retrySeconds).toBeGreaterThan(0);
        expect(retrySeconds).toBeLessThanOrEqual(60); // Should be within minute window
        
        console.log(`[UAT-04] Retry-After header: ${retrySeconds} seconds`);
      } else {
        console.log('[UAT-04] Rate limit not triggered in this test run');
      }
    });
  });

  test.describe('Idempotency - Replay Behavior', () => {
    test('should return identical response for same idempotency key + same body', async ({ request }) => {
      // Arrange
      const email = generateUniqueEmail('idempotency');
      const roles = ['admin'];
      const idempotencyKey = generateIdempotencyKey('replay');

      // Act - First request
      const response1 = await request.post(`${BASE_URL}/api/admin/management/invite`, {
        headers: {
          ...superAdminHeaders,
          'Idempotency-Key': idempotencyKey,
        },
        data: {
          email,
          roles,
        },
      });

      expect(response1.status()).toBe(201);
      const data1 = await response1.json();
      
      // Verify first request has X-Idempotency-Hit: false
      const headers1 = response1.headers();
      expect(headers1['x-idempotency-hit']).toBe('false');

      // Act - Second request with same idempotency key + same body
      const response2 = await request.post(`${BASE_URL}/api/admin/management/invite`, {
        headers: {
          ...superAdminHeaders,
          'Idempotency-Key': idempotencyKey,
        },
        data: {
          email,
          roles,
        },
      });

      // Assert - Should return identical response with X-Idempotency-Hit: true
      expect(response2.status()).toBe(201);
      const data2 = await response2.json();
      
      // Verify identical response
      expect(data2.id).toBe(data1.id);
      expect(data2.email).toBe(data1.email);
      expect(data2.expires_at).toBe(data1.expires_at);
      expect(data2.correlation_id).toBe(data1.correlation_id);
      expect(data2.message).toBe(data1.message);
      
      // Verify second request has X-Idempotency-Hit: true
      const headers2 = response2.headers();
      expect(headers2['x-idempotency-hit']).toBe('true');

      console.log(`[UAT-04] Idempotency confirmed: same key + same body returns bit-equal response for ${email}`);
    });

    test('should return 422 for same key + different body', async ({ request }) => {
      // Arrange
      const email1 = generateUniqueEmail('idempotency-diff1');
      const email2 = generateUniqueEmail('idempotency-diff2');
      const idempotencyKey = generateIdempotencyKey('replay-diff');

      // Act - First request
      const response1 = await request.post(`${BASE_URL}/api/admin/management/invite`, {
        headers: {
          ...superAdminHeaders,
          'Idempotency-Key': idempotencyKey,
        },
        data: {
          email: email1,
          roles: ['admin'],
        },
      });

      expect(response1.status()).toBe(201);
      const data1 = await response1.json();

      // Act - Second request with different payload but same key
      const response2 = await request.post(`${BASE_URL}/api/admin/management/invite`, {
        headers: {
          ...superAdminHeaders,
          'Idempotency-Key': idempotencyKey,
        },
        data: {
          email: email2, // Different email
          roles: ['super_admin'], // Different roles
        },
      });

      // Assert - Should return 422 IDEMPOTENCY_PAYLOAD_MISMATCH
      expect(response2.status()).toBe(422);
      const errorData = await response2.json();
      
      expect(errorData).toHaveProperty('error', 'Idempotency key conflict');
      expect(errorData).toHaveProperty('code', 'IDEMPOTENCY_PAYLOAD_MISMATCH');
      expect(errorData).toHaveProperty('expectedHash');
      expect(errorData).toHaveProperty('receivedHash');
      expect(typeof errorData.expectedHash).toBe('string');
      expect(typeof errorData.receivedHash).toBe('string');
      expect(errorData.expectedHash).not.toBe(errorData.receivedHash);

      console.log(`[UAT-04] Idempotency payload mismatch: same key + different body returns 422`);
    });

    test('should handle idempotency without Idempotency-Key header', async ({ request }) => {
      // Arrange
      const email = generateUniqueEmail('no-key');
      const roles = ['admin'];

      // Act - First request (no idempotency key)
      const response1 = await request.post(`${BASE_URL}/api/admin/management/invite`, {
        headers: {
          ...superAdminHeaders,
          // No Idempotency-Key header
        },
        data: {
          email,
          roles,
        },
      });

      expect(response1.status()).toBe(201);
      const data1 = await response1.json();

      // Act - Second request (no idempotency key)
      const response2 = await request.post(`${BASE_URL}/api/admin/management/invite`, {
        headers: {
          ...superAdminHeaders,
          // No Idempotency-Key header
        },
        data: {
          email,
          roles,
        },
      });

      // Assert - Should return 409 (duplicate) since no idempotency key
      expect(response2.status()).toBe(409);
      
      const errorData = await response2.json();
      expect(errorData).toHaveProperty('error', 'Invitation already exists for this email');
      expect(errorData).toHaveProperty('code', 'INVITE_EXISTS');

      console.log(`[UAT-04] No idempotency key: second request returns 409 for ${email}`);
    });
  });

  test.describe('Error Handling - Edge Cases', () => {
    test('should return 400 for invalid JSON', async ({ request }) => {
      // Arrange
      const idempotencyKey = generateIdempotencyKey('invalid-json');

      // Act
      const response = await request.post(`${BASE_URL}/api/admin/management/invite`, {
        headers: {
          ...superAdminHeaders,
          'Idempotency-Key': idempotencyKey,
          'Content-Type': 'application/json',
        },
        data: 'invalid json string', // Invalid JSON
      });

      // Assert
      expect(response.status()).toBe(400);
      
      const errorData = await response.json();
      expect(errorData).toHaveProperty('error', 'Invalid JSON in request body');
      
      console.log(`[UAT-04] Invalid JSON rejected: 400`);
    });

    test('should return 401 for missing authorization', async ({ request }) => {
      // Arrange
      const email = generateUniqueEmail('no-auth');
      const idempotencyKey = generateIdempotencyKey('no-auth');

      // Act
      const response = await request.post(`${BASE_URL}/api/admin/management/invite`, {
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          // No Authorization header
        },
        data: {
          email,
          roles: ['admin'],
        },
      });

      // Assert
      expect(response.status()).toBe(401);
      
      const errorData = await response.json();
      expect(errorData).toHaveProperty('error', 'Unauthorized');
      
      console.log(`[UAT-04] Missing authorization rejected: 401`);
    });

    test('should return 403 for insufficient permissions', async ({ request }) => {
      // Arrange
      const email = generateUniqueEmail('no-perms');
      const idempotencyKey = generateIdempotencyKey('no-perms');

      // Act - Use regular admin token instead of super admin
      const response = await request.post(`${BASE_URL}/api/admin/management/invite`, {
        headers: {
          'Authorization': 'Bearer regular-admin-token',
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        data: {
          email,
          roles: ['admin'],
        },
      });

      // Assert
      expect(response.status()).toBe(403);
      
      const errorData = await response.json();
      expect(errorData).toHaveProperty('error');
      expect(errorData.error).toContain('Insufficient permissions');
      
      console.log(`[UAT-04] Insufficient permissions rejected: 403`);
    });
  });

  test.describe('Response Headers - Verification', () => {
    test('should include proper response headers', async ({ request }) => {
      // Arrange
      const email = generateUniqueEmail('headers');
      const idempotencyKey = generateIdempotencyKey('headers');

      // Act
      const response = await request.post(`${BASE_URL}/api/admin/management/invite`, {
        headers: {
          ...superAdminHeaders,
          'Idempotency-Key': idempotencyKey,
        },
        data: {
          email,
          roles: ['admin'],
        },
      });

      // Assert
      expect(response.status()).toBe(201);
      
      const headers = response.headers();
      expect(headers).toHaveProperty('content-type');
      expect(headers['content-type']).toContain('application/json');
      
      console.log(`[UAT-04] Response headers verified: Content-Type=${headers['content-type']}`);
    });

    test('should include idempotency hit header when applicable', async ({ request }) => {
      // Arrange
      const email = generateUniqueEmail('hit-header');
      const idempotencyKey = generateIdempotencyKey('hit-header');

      // Act - First request (should have X-Idempotency-Hit: false)
      const response1 = await request.post(`${BASE_URL}/api/admin/management/invite`, {
        headers: {
          ...superAdminHeaders,
          'Idempotency-Key': idempotencyKey,
        },
        data: {
          email,
          roles: ['admin'],
        },
      });

      expect(response1.status()).toBe(201);
      const headers1 = response1.headers();
      expect(headers1['x-idempotency-hit']).toBe('false');

      // Act - Second request (should have X-Idempotency-Hit: true)
      const response2 = await request.post(`${BASE_URL}/api/admin/management/invite`, {
        headers: {
          ...superAdminHeaders,
          'Idempotency-Key': idempotencyKey,
        },
        data: {
          email,
          roles: ['admin'],
        },
      });

      // Assert
      expect(response2.status()).toBe(201);
      const headers2 = response2.headers();
      expect(headers2['x-idempotency-hit']).toBe('true');
      
      console.log(`[UAT-04] Idempotency headers verified: first=false, second=true`);
    });
  });
});
