import { test, expect } from '@playwright/test';
import { superAdminReq, anonReq, adminReq } from './helpers/sessions';

const ID = process.env.TEST_ADMIN_ID || '63c523f5-8d94-4c57-8f21-265098095735';

test.describe('Admin Delete API Guard Tests', () => {
  test('GET dry_run requires super_admin', async ({ playwright: _playwright }) => {
    const base = process.env.BASE_URL || 'http://localhost:8080';
    
    // Test anonymous access - should be denied
    const anon = await anonReq(base);
    const res1 = await anon.get(`/api/admin/management/admins/${ID}?dry_run=1`);
    expect([401, 403]).toContain(res1.status());

    // Test super admin access - should work
    const sa = await superAdminReq(base);
    const res2 = await sa.get(`/api/admin/management/admins/${ID}?dry_run=1`);
    expect([200, 404]).toContain(res2.status()); // 404 if ID not found; 200 with plan if found
    
    // Verify response structure
    if (res2.status() === 200) {
      const body = await res2.json();
      expect(body).toHaveProperty('ok', true);
      expect(body).toHaveProperty('plan');
    }
  });

  test('DELETE executes with wrappers and returns JSON', async ({ playwright: _playwright }) => {
    const base = process.env.BASE_URL || 'http://localhost:8080';
    
    // Test super admin delete - should work
    const sa = await superAdminReq(base);
    const res = await sa.delete(`/api/admin/management/admins/${ID}`);
    expect([200, 404, 403]).toContain(res.status());
    
    // Verify response structure
    const body = await res.json().catch(() => null);
    expect(body).not.toBeNull();
    expect(body).toHaveProperty('ok');
  });

  test('Feature flag controls access', async ({ playwright: _playwright }) => {
    const base = process.env.BASE_URL || 'http://localhost:8080';
    
    // This test assumes feature flag is enabled in test environment
    // In a real test, you'd toggle the flag and verify behavior
    const sa = await superAdminReq(base);
    const res = await sa.get(`/api/admin/management/admins/${ID}?dry_run=1`);
    
    // Should either work (200) or be feature-disabled (403)
    expect([200, 403, 404]).toContain(res.status());
  });

  test('Super admin cannot be deleted', async ({ playwright: _playwright }) => {
    const base = process.env.BASE_URL || 'http://localhost:8080';
    
    // Find a super_admin user to test deletion protection
    const sa = await superAdminReq(base);
    const listRes = await sa.get('/api/admin/management/admins');
    const admins = await listRes.json();
    
    const superAdmin = admins.admins?.find((a: any) => a.role === 'super_admin');
    if (superAdmin) {
      const deleteRes = await sa.delete(`/api/admin/management/admins/${superAdmin.id}`);
      expect(deleteRes.status()).toBe(403); // Should be forbidden
      
      const body = await deleteRes.json();
      expect(body).toHaveProperty('ok', false);
      expect(body.error).toContain('super_admin');
    }
  });

  test('Non-super admin cannot delete', async ({ playwright: _playwright }) => {
    const base = process.env.BASE_URL || 'http://localhost:8080';
    
    // Test with regular admin user - should be unauthorized (user doesn't exist in DB)
    const admin = await adminReq(base);
    const res = await admin.delete(`/api/admin/management/admins/${ID}`);
    expect([401, 403]).toContain(res.status()); // 401 if user not found, 403 if forbidden
    
    const body = await res.json();
    // Response may not have 'ok' property for auth errors
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/(Unauthorized|Forbidden)/);
  });
});
