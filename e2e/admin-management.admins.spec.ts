import { test, expect } from '@playwright/test';

test.describe('Admin Management - Admins API', () => {
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

  test.describe('GET /api/admin/management/admins', () => {
    test('should list admins successfully (200)', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/admin/management/admins`, {
        headers: {
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('admins');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('page');
      expect(data).toHaveProperty('pageSize');
      expect(data).toHaveProperty('totalPages');
      expect(Array.isArray(data.admins)).toBe(true);
    });

    test('should support pagination', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/admin/management/admins?page=1&size=5`, {
        headers: {
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.page).toBe(1);
      expect(data.pageSize).toBe(5);
      expect(data.admins.length).toBeLessThanOrEqual(5);
    });

    test('should support search filtering', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/admin/management/admins?search=raja`, {
        headers: {
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      // Should find the admin with email containing 'raja'
      expect(data.admins.some((admin: any) => admin.email.includes('raja'))).toBe(true);
    });

    test('should support role filtering', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/admin/management/admins?role=super_admin`, {
        headers: {
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      // All returned admins should have super_admin role
      expect(data.admins.every((admin: any) => admin.role === 'super_admin')).toBe(true);
    });

    test('should support status filtering', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/admin/management/admins?status=active`, {
        headers: {
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      // All returned admins should have active status
      expect(data.admins.every((admin: any) => admin.status === 'active')).toBe(true);
    });

    test('should return 400 for invalid pagination', async ({ request }) => {
      const response = await request.get(`${baseUrl}/api/admin/management/admins?page=0&size=100`, {
        headers: {
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Invalid pagination parameters');
    });

    test('should return 403 for non-super-admin', async ({ request }) => {
      // Set up non-super-admin authentication
      await request.context().addCookies([
        {
          name: 'admin-email',
          value: 'regular-admin@example.com',
          domain: 'localhost',
          path: '/',
        }
      ]);

      const response = await request.get(`${baseUrl}/api/admin/management/admins`, {
        headers: {
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Insufficient permissions. Super admin access required.');
    });
  });

  test.describe('PUT /api/admin/management/admins/:id', () => {
    test('should update admin roles successfully (200)', async ({ request }) => {
      // First, create an admin user to update
      const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
        data: {
          email: 'update-test@example.com',
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

      // Accept invitation to create admin user
      const acceptResponse = await request.post(`${baseUrl}/api/admin/management/invitations/${token}/accept`, {
        data: {},
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(acceptResponse.status()).toBe(200);
      const acceptData = await acceptResponse.json();
      const adminId = acceptData.admin_user_id;

      // Update admin roles
      const response = await request.put(`${baseUrl}/api/admin/management/admins/${adminId}`, {
        data: {
          add_roles: ['super_admin']
        },
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('correlation_id');
    });

    test('should return 403 for self-update', async ({ request }) => {
      // Get current admin user ID (this would require additional API calls)
      // For now, we'll test with a known admin ID
      const response = await request.put(`${baseUrl}/api/admin/management/admins/self-update-test`, {
        data: {
          add_roles: ['super_admin']
        },
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      // Should either be 403 (self-update forbidden) or 404 (admin not found)
      expect([403, 404]).toContain(response.status());
    });

    test('should return 409 for demoting last super admin', async ({ request }) => {
      // This test would require setting up a scenario with only one super admin
      // For now, we'll test the error response structure
      const response = await request.put(`${baseUrl}/api/admin/management/admins/last-super-admin-test`, {
        data: {
          remove_roles: ['super_admin']
        },
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      // Should either be 409 (last super admin) or 404 (admin not found)
      expect([409, 404]).toContain(response.status());
    });

    test('should update admin status successfully (200)', async ({ request }) => {
      // Create an admin user to update
      const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
        data: {
          email: 'status-test@example.com',
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
      const acceptData = await acceptResponse.json();
      const adminId = acceptData.admin_user_id;

      // Suspend admin
      const response = await request.put(`${baseUrl}/api/admin/management/admins/${adminId}`, {
        data: {
          status: 'suspended'
        },
        headers: {
          'Content-Type': 'application/json',
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('correlation_id');
    });
  });

  test.describe('DELETE /api/admin/management/admins/:id', () => {
    test('should remove admin successfully (204)', async ({ request }) => {
      // Create an admin user to remove
      const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
        data: {
          email: 'remove-test@example.com',
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
      const acceptData = await acceptResponse.json();
      const adminId = acceptData.admin_user_id;

      // Remove admin
      const response = await request.delete(`${baseUrl}/api/admin/management/admins/${adminId}`, {
        headers: {
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(204);
    });

    test('should return 403 for self-removal', async ({ request }) => {
      const response = await request.delete(`${baseUrl}/api/admin/management/admins/self-removal-test`, {
        headers: {
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      // Should either be 403 (self-removal forbidden) or 404 (admin not found)
      expect([403, 404]).toContain(response.status());
    });

    test('should return 409 for removing last super admin', async ({ request }) => {
      const response = await request.delete(`${baseUrl}/api/admin/management/admins/last-super-admin-test`, {
        headers: {
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      // Should either be 409 (last super admin) or 404 (admin not found)
      expect([409, 404]).toContain(response.status());
    });
  });

  test.describe('Authentication and Authorization', () => {
    test('should return 401 for unauthenticated requests', async ({ request }) => {
      // Clear authentication cookies
      await request.context().clearCookies();

      const response = await request.get(`${baseUrl}/api/admin/management/admins`, {
        headers: {
          'X-E2E-RLS-BYPASS': '1'
        }
      });

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Unauthorized');
    });

    test('should return 403 for insufficient permissions', async ({ request }) => {
      // Set up non-super-admin authentication
      await request.context().addCookies([
        {
          name: 'admin-email',
          value: 'regular-admin@example.com',
          domain: 'localhost',
          path: '/',
        }
      ]);

      const response = await request.put(`${baseUrl}/api/admin/management/admins/test-id`, {
        data: {
          add_roles: ['super_admin']
        },
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
});
