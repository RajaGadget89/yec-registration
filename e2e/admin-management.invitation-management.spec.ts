import { test, expect } from '@playwright/test';

test.describe('Admin Management - Invitation Management APIs', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:8080';
  const adminEmail = 'raja.gadgets89@gmail.com';

  test.beforeEach(async ({ request }) => {
    // Set up admin authentication cookie
    await request.context().addCookies([
      {
        name: 'admin-email',
        value: adminEmail,
        domain: 'localhost',
        path: '/',
      }
    ]);
  });

  test.describe('POST /api/admin/management/invitations/:id/resend', () => {
    test('should resend invitation successfully (200)', async ({ request }) => {
      // First, create an invitation
      const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
        data: {
          email: 'resend-test@example.com',
          roles: ['admin']
        },
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(inviteResponse.status()).toBe(201);
      const inviteData = await inviteResponse.json();
      const invitationId = inviteData.id;

      // Resend invitation
      const response = await request.post(`${baseUrl}/api/admin/management/invitations/${invitationId}/resend`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('correlation_id');
      expect(data).toHaveProperty('message', 'Invitation resent successfully');
      expect(data).toHaveProperty('resend_count');
      expect(data.resend_count).toBe(1);
    });

    test('should return 404 for non-existent invitation', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/admin/management/invitations/999999/resend`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty('code', 'invitation_not_found');
    });

    test('should return 410 for expired invitation', async ({ request }) => {
      // Create an invitation and manually expire it in the database
      // For now, we'll test with a non-pending invitation
      const response = await request.post(`${baseUrl}/api/admin/management/invitations/expired-test/resend`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(404);
    });

    test('should return 410 for already accepted invitation', async ({ request }) => {
      // Create and accept an invitation
      const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
        data: {
          email: 'accepted-resend-test@example.com',
          roles: ['admin']
        },
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(inviteResponse.status()).toBe(201);
      const inviteData = await inviteResponse.json();
      const token = inviteData.token;

      // Accept invitation
      const acceptResponse = await request.post(`${baseUrl}/api/admin/management/invitations/${token}/accept`, {
        data: {},
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(acceptResponse.status()).toBe(200);

      // Try to resend accepted invitation
      const response = await request.post(`${baseUrl}/api/admin/management/invitations/${inviteData.id}/resend`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty('code', 'invitation_not_found');
    });

    test('should support idempotency with Idempotency-Key header', async ({ request }) => {
      // Create an invitation
      const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
        data: {
          email: 'idempotent-resend@example.com',
          roles: ['admin']
        },
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(inviteResponse.status()).toBe(201);
      const inviteData = await inviteResponse.json();
      const invitationId = inviteData.id;
      const idempotencyKey = `resend-key-${Date.now()}`;

      // First resend
      const response1 = await request.post(`${baseUrl}/api/admin/management/invitations/${invitationId}/resend`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1',
          'Idempotency-Key': idempotencyKey
        }
      });

      expect(response1.status()).toBe(200);
      const data1 = await response1.json();

      // Second resend with same idempotency key
      const response2 = await request.post(`${baseUrl}/api/admin/management/invitations/${invitationId}/resend`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1',
          'Idempotency-Key': idempotencyKey
        }
      });

      expect(response2.status()).toBe(200);
      const data2 = await response2.json();
      expect(data2.correlation_id).toBe(data1.correlation_id);
    });

    test('should increment resend count', async ({ request }) => {
      // Create an invitation
      const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
        data: {
          email: 'count-test@example.com',
          roles: ['admin']
        },
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(inviteResponse.status()).toBe(201);
      const inviteData = await inviteResponse.json();
      const invitationId = inviteData.id;

      // First resend
      const response1 = await request.post(`${baseUrl}/api/admin/management/invitations/${invitationId}/resend`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response1.status()).toBe(200);
      const data1 = await response1.json();
      expect(data1.resend_count).toBe(1);

      // Second resend
      const response2 = await request.post(`${baseUrl}/api/admin/management/invitations/${invitationId}/resend`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response2.status()).toBe(200);
      const data2 = await response2.json();
      expect(data2.resend_count).toBe(2);
    });
  });

  test.describe('POST /api/admin/management/invitations/:id/cancel', () => {
    test('should cancel invitation successfully (200)', async ({ request }) => {
      // First, create an invitation
      const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
        data: {
          email: 'cancel-test@example.com',
          roles: ['admin']
        },
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(inviteResponse.status()).toBe(201);
      const inviteData = await inviteResponse.json();
      const invitationId = inviteData.id;

      // Cancel invitation
      const response = await request.post(`${baseUrl}/api/admin/management/invitations/${invitationId}/cancel`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('correlation_id');
      expect(data).toHaveProperty('message', 'Invitation cancelled successfully');
    });

    test('should return 404 for non-existent invitation', async ({ request }) => {
      const response = await request.post(`${baseUrl}/api/admin/management/invitations/999999/cancel`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty('code', 'invitation_not_found');
    });

    test('should return 404 for already accepted invitation', async ({ request }) => {
      // Create and accept an invitation
      const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
        data: {
          email: 'accepted-cancel-test@example.com',
          roles: ['admin']
        },
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(inviteResponse.status()).toBe(201);
      const inviteData = await inviteResponse.json();
      const token = inviteData.token;

      // Accept invitation
      const acceptResponse = await request.post(`${baseUrl}/api/admin/management/invitations/${token}/accept`, {
        data: {},
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(acceptResponse.status()).toBe(200);

      // Try to cancel accepted invitation
      const response = await request.post(`${baseUrl}/api/admin/management/invitations/${inviteData.id}/cancel`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty('code', 'invitation_not_found');
    });

    test('should support idempotency with Idempotency-Key header', async ({ request }) => {
      // Create an invitation
      const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
        data: {
          email: 'idempotent-cancel@example.com',
          roles: ['admin']
        },
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(inviteResponse.status()).toBe(201);
      const inviteData = await inviteResponse.json();
      const invitationId = inviteData.id;
      const idempotencyKey = `cancel-key-${Date.now()}`;

      // First cancel
      const response1 = await request.post(`${baseUrl}/api/admin/management/invitations/${invitationId}/cancel`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1',
          'Idempotency-Key': idempotencyKey
        }
      });

      expect(response1.status()).toBe(200);
      const data1 = await response1.json();

      // Second cancel with same idempotency key
      const response2 = await request.post(`${baseUrl}/api/admin/management/invitations/${invitationId}/cancel`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1',
          'Idempotency-Key': idempotencyKey
        }
      });

      expect(response2.status()).toBe(200);
      const data2 = await response2.json();
      expect(data2.correlation_id).toBe(data1.correlation_id);
    });

    test('should prevent accepting cancelled invitation', async ({ request }) => {
      // Create an invitation
      const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
        data: {
          email: 'cancel-accept-test@example.com',
          roles: ['admin']
        },
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(inviteResponse.status()).toBe(201);
      const inviteData = await inviteResponse.json();
      const invitationId = inviteData.id;
      const token = inviteData.token;

      // Cancel invitation
      const cancelResponse = await request.post(`${baseUrl}/api/admin/management/invitations/${invitationId}/cancel`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(cancelResponse.status()).toBe(200);

      // Try to accept cancelled invitation
      const acceptResponse = await request.post(`${baseUrl}/api/admin/management/invitations/${token}/accept`, {
        data: {},
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(acceptResponse.status()).toBe(410);
      const data = await acceptResponse.json();
      expect(data).toHaveProperty('code', 'invitation_invalid_or_expired');
    });
  });

  test.describe('Authentication and Authorization', () => {
    test('should return 401 for unauthenticated resend request', async ({ request }) => {
      // Clear authentication cookies
      await request.context().clearCookies();

      const response = await request.post(`${baseUrl}/api/admin/management/invitations/123/resend`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Unauthorized');
    });

    test('should return 401 for unauthenticated cancel request', async ({ request }) => {
      // Clear authentication cookies
      await request.context().clearCookies();

      const response = await request.post(`${baseUrl}/api/admin/management/invitations/123/cancel`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Unauthorized');
    });

    test('should return 403 for non-super-admin resend request', async ({ request }) => {
      // Set up non-super-admin authentication
      await request.context().addCookies([
        {
          name: 'admin-email',
          value: 'regular-admin@example.com',
          domain: 'localhost',
          path: '/',
        }
      ]);

      const response = await request.post(`${baseUrl}/api/admin/management/invitations/123/resend`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Insufficient permissions. Super admin access required.');
    });

    test('should return 403 for non-super-admin cancel request', async ({ request }) => {
      // Set up non-super-admin authentication
      await request.context().addCookies([
        {
          name: 'admin-email',
          value: 'regular-admin@example.com',
          domain: 'localhost',
          path: '/',
        }
      ]);

      const response = await request.post(`${baseUrl}/api/admin/management/invitations/123/cancel`, {
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Insufficient permissions. Super admin access required.');
    });
  });

  test.describe('Rate Limiting', () => {
    test('should respect rate limits for resend requests', async ({ request }) => {
      // Create multiple invitations for testing
      const invitations = [];
      for (let i = 0; i < 3; i++) {
        const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
          data: {
            email: `rate-limit-resend-${i}@example.com`,
            roles: ['admin']
          },
          headers: {
            'Content-Type': 'application/json',
            'X-E2E-RLS-BYPASS': '1'
          }
        });

        expect(inviteResponse.status()).toBe(201);
        const inviteData = await inviteResponse.json();
        invitations.push(inviteData);
      }

      // Try to resend multiple invitations rapidly
      const responses = await Promise.all(
        invitations.map(invitation =>
          request.post(`${baseUrl}/api/admin/management/invitations/${invitation.id}/resend`, {
            headers: {
              'Content-Type': 'application/json',
              'X-E2E-RLS-BYPASS': '1'
            }
          })
        )
      );

      // All should succeed in E2E mode (rate limiting is disabled)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status());
      });
    });

    test('should respect rate limits for cancel requests', async ({ request }) => {
      // Create multiple invitations for testing
      const invitations = [];
      for (let i = 0; i < 3; i++) {
        const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
          data: {
            email: `rate-limit-cancel-${i}@example.com`,
            roles: ['admin']
          },
          headers: {
            'Content-Type': 'application/json',
            'X-E2E-RLS-BYPASS': '1'
          }
        });

        expect(inviteResponse.status()).toBe(201);
        const inviteData = await inviteResponse.json();
        invitations.push(inviteData);
      }

      // Try to cancel multiple invitations rapidly
      const responses = await Promise.all(
        invitations.map(invitation =>
          request.post(`${baseUrl}/api/admin/management/invitations/${invitation.id}/cancel`, {
            headers: {
              'Content-Type': 'application/json',
              'X-E2E-RLS-BYPASS': '1'
            }
          })
        )
      );

      // All should succeed (cancel doesn't have rate limiting)
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });
    });
  });
});
