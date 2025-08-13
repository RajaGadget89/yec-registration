import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@test.com';

describe('Phase 0: Foundation Security Implementation', () => {
  let adminCookies: string[] = [];

  beforeAll(async () => {
    // Set up admin authentication for tests
    console.log('Setting up admin authentication for Phase 0 tests...');
    
    // This would normally involve getting admin cookies through the auth flow
    // For now, we'll simulate the admin authentication
    adminCookies = [`admin-email=${ADMIN_EMAIL}`];
  });

  afterAll(async () => {
    console.log('Cleaning up Phase 0 test data...');
  });

  describe('1. Data Model & Buckets', () => {
    it('should verify registrations table exists with required fields', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/phase0-verification`, {
        headers: {
          'Cookie': adminCookies.join('; '),
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.dataModel.success).toBe(true);
      expect(data.data.dataModel.message).toContain('Registrations table exists');
    });

    it('should verify all required storage buckets exist', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/phase0-verification`, {
        headers: {
          'Cookie': adminCookies.join('; '),
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.storageBuckets.exists).toBe(true);
      expect(data.data.storageBuckets.missing).toEqual([]);
    });

    it('should create missing storage buckets if needed', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/phase0-verification`, {
        method: 'POST',
        headers: {
          'Cookie': adminCookies.join('; '),
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.message).toContain('All required storage buckets created successfully');
    });
  });

  describe('2. Temporary Admin Gate', () => {
    it('should return 401 for unauthenticated admin route access', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/phase0-verification`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Unauthorized');
    });

    it('should allow access for authenticated admin users', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/phase0-verification`, {
        headers: {
          'Cookie': adminCookies.join('; '),
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should verify admin guards are working on all admin routes', async () => {
      const adminRoutes = [
        '/api/admin/registrations',
        '/api/admin/approve-registration',
        '/api/admin/export-csv',
        '/api/admin/setup-storage',
        '/api/admin/verify-audit'
      ];

      for (const route of adminRoutes) {
        const response = await fetch(`${BASE_URL}${route}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // Should return 401 for unauthenticated access
        expect(response.status).toBe(401);
      }
    });
  });

  describe('3. Event & Audit Hooks', () => {
    it('should verify audit system is working', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/verify-audit`, {
        headers: {
          'Cookie': adminCookies.join('; '),
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.success).toBe(true);
      expect(data.data.summary.passed).toBeGreaterThan(0);
    });

    it('should verify audit logging for admin dashboard access', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/verify-audit`, {
        headers: {
          'Cookie': adminCookies.join('; '),
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      const dashboardAccessTest = data.data.tests.find(
        (test: any) => test.name === 'Admin Dashboard Access Logging'
      );
      
      expect(dashboardAccessTest).toBeDefined();
      expect(dashboardAccessTest.passed).toBe(true);
    });

    it('should verify audit logging for registration creation', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/verify-audit`, {
        headers: {
          'Cookie': adminCookies.join('; '),
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      const registrationTest = data.data.tests.find(
        (test: any) => test.name === 'Registration Creation Logging'
      );
      
      expect(registrationTest).toBeDefined();
      expect(registrationTest.passed).toBe(true);
    });

    it('should verify audit logging for status changes', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/verify-audit`, {
        headers: {
          'Cookie': adminCookies.join('; '),
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      const statusChangeTest = data.data.tests.find(
        (test: any) => test.name === 'Status Change Logging'
      );
      
      expect(statusChangeTest).toBeDefined();
      expect(statusChangeTest.passed).toBe(true);
    });

    it('should verify audit logging for file uploads', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/verify-audit`, {
        headers: {
          'Cookie': adminCookies.join('; '),
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      const fileUploadTest = data.data.tests.find(
        (test: any) => test.name === 'File Upload Logging'
      );
      
      expect(fileUploadTest).toBeDefined();
      expect(fileUploadTest.passed).toBe(true);
    });
  });

  describe('4. Definition of Done Verification', () => {
    it('should meet all DoD requirements', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/phase0-verification`, {
        headers: {
          'Cookie': adminCookies.join('; '),
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      // All requirements should be met
      expect(data.success).toBe(true);
      expect(data.data.overall.passed).toBe(data.data.overall.total);
      expect(data.message).toContain('Phase 0 verification passed');
    });

    it('should verify visiting admin routes without authentication returns 401/403', async () => {
      const adminRoutes = [
        '/admin',
        '/admin/audit',
        '/api/admin/registrations'
      ];

      for (const route of adminRoutes) {
        const response = await fetch(`${BASE_URL}${route}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // Should return 401 or 403 for unauthenticated access
        expect([401, 403]).toContain(response.status);
      }
    });

    it('should verify all three storage buckets exist and are properly configured', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/setup-storage`, {
        headers: {
          'Cookie': adminCookies.join('; '),
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.allBucketsExist).toBe(true);
      expect(data.data.requiredBuckets).toHaveLength(4); // profile-images, chamber-cards, payment-slips, yec-badges
    });

    it('should verify registrations table schema matches documented requirements', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/phase0-verification`, {
        headers: {
          'Cookie': adminCookies.join('; '),
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.data.dataModel.success).toBe(true);
      expect(data.data.dataModel.message).toContain('required fields and status enum values');
    });

    it('should verify audit log entries are created for required events', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/verify-audit`, {
        headers: {
          'Cookie': adminCookies.join('; '),
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.data.success).toBe(true);
      expect(data.data.summary.passed).toBeGreaterThanOrEqual(4); // At least 4 audit tests should pass
    });
  });
});

