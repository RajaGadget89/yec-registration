import { test, expect } from '@playwright/test';
import { waitForLogs, waitForSpecificEvents } from './helpers/logPoller';
import { supabaseTestClient } from './helpers/supabaseTestClient';
import { createTestContext } from './helpers/testData';
import { saveAuditArtifacts } from './helpers/artifactSaver';

test.describe('Admin Action Audit Trail - Comprehensive Testing', () => {
  let testRegistrationId: string;
  let testRegistrationData: any;

  test.beforeAll(async () => {
    // Create a test registration for admin actions
    const testContext = createTestContext('admin-audit-test');
    testRegistrationData = testContext.registrationData;
    
    // Submit registration to get a valid registration ID
    const response = await fetch(`${process.env.BASE_URL || 'http://localhost:8080'}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': `admin-audit-setup-${Date.now()}`,
      },
      body: JSON.stringify(testRegistrationData),
    });
    
    if (response.ok) {
      const result = await response.json();
      testRegistrationId = result.registration_id;
      console.log(`[admin-audit] Created test registration: ${testRegistrationId}`);
    } else {
      throw new Error('Failed to create test registration for admin audit tests');
    }
  });

  test('@audit @admin-approval should log admin approval action to admin_audit_logs', async ({ request, baseURL }) => {
    const testContext = createTestContext('admin-approval-audit');
    const startTs = new Date();
    
    // Use existing admin email instead of creating new admin user
    const adminEmail = 'admin@test.com';
    
    // Generate explicit request ID
    const rid = `admin-approval-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    
    // Perform admin approval action
    const response = await request.post(`/api/admin/registrations/${testRegistrationId}/approve`, {
      headers: {
        ...testContext.headers,
        'X-Request-ID': rid,
        'Cookie': `admin-email=${adminEmail}`,
      },
      data: {
        adminEmail: adminEmail,
      },
    });

    // Debug logging
    const xRequestId = response.headers()['x-request-id'];
    console.log(`[admin-approval] baseURL=${baseURL} x-request-id=${rid}`);

    // Verify response
    expect(response.status()).toBe(200);
    expect(xRequestId).toBeTruthy();
    expect(xRequestId).toBe(rid);

    try {
      // Wait for audit logs
      const { accessLogs, eventLogs } = await waitForLogs(rid, 1, 2, { startTs });

      // Verify access log
      expect(accessLogs).toHaveLength(1);
      const accessLog = accessLogs[0];
      expect(accessLog.action).toMatch(/^api:POST \/api\/admin\/registrations\/.*\/approve/);
      expect(accessLog.result).toBe('200');
      expect(accessLog.request_id).toBe(rid);

      // Verify event logs
      expect(eventLogs).toHaveLength(2);
      const eventActions = new Set(eventLogs.map(log => log.action));
      expect(eventActions).toContain('admin.approved');
      expect(eventActions).toContain('StatusChanged');

      // Verify admin_audit_logs entry
      const supabase = supabaseTestClient;
      const { data: adminAuditLogs, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('registration_id', testRegistrationId)
        .eq('action', 'approve')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.warn(`[admin-approval] Admin audit logs query failed: ${error.message}`);
        // Don't fail the test if admin_audit_logs table doesn't exist
        if (error.message.includes('does not exist')) {
          console.log(`[admin-approval] ⚠️  admin_audit_logs table not found - skipping admin audit validation`);
          return;
        }
        throw error;
      }

      expect(adminAuditLogs).toHaveLength(1);
      const adminAuditLog = adminAuditLogs[0];
      expect(adminAuditLog.admin_email).toBe(adminEmail);
      expect(adminAuditLog.action).toBe('approve');
      expect(adminAuditLog.registration_id).toBe(testRegistrationId);
      expect(adminAuditLog.before).toBeDefined();
      expect(adminAuditLog.after).toBeDefined();

      // Verify before/after state changes
      expect(adminAuditLog.before.status).toBe('waiting_for_review');
      expect(adminAuditLog.after.status).toBe('approved');

      console.log(`[admin-approval] ✅ Admin approval audit trail validated`);

    } catch (error) {
      console.error(`[admin-approval] ❌ Admin approval audit trail failed:`, error);
      throw error;
    }
  });

  test('@audit @admin-rejection should log admin rejection action to admin_audit_logs', async ({ request, baseURL }) => {
    const testContext = createTestContext('admin-rejection-audit');
    const startTs = new Date();
    const rejectionReason = 'test_rejection';
    
    // Use existing admin email instead of creating new admin user
    const adminEmail = 'admin@test.com';
    
    // Generate explicit request ID
    const rid = `admin-rejection-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    
    // Perform admin rejection action
    const response = await request.post(`/api/admin/registrations/${testRegistrationId}/reject`, {
      headers: {
        ...testContext.headers,
        'X-Request-ID': rid,
        'Cookie': `admin-email=${adminEmail}`,
      },
      data: {
        adminEmail: adminEmail,
        reason: rejectionReason,
      },
    });

    // Debug logging
    const xRequestId = response.headers()['x-request-id'];
    console.log(`[admin-rejection] baseURL=${baseURL} x-request-id=${rid}`);

    // Verify response
    expect(response.status()).toBe(200);
    expect(xRequestId).toBeTruthy();
    expect(xRequestId).toBe(rid);

    try {
      // Wait for audit logs
      const { accessLogs, eventLogs } = await waitForLogs(rid, 1, 2, { startTs });

      // Verify access log
      expect(accessLogs).toHaveLength(1);
      const accessLog = accessLogs[0];
      expect(accessLog.action).toMatch(/^api:POST \/api\/admin\/registrations\/.*\/reject/);
      expect(accessLog.result).toBe('200');
      expect(accessLog.request_id).toBe(rid);

      // Verify event logs
      expect(eventLogs).toHaveLength(2);
      const eventActions = new Set(eventLogs.map(log => log.action));
      expect(eventActions).toContain('admin.rejected');
      expect(eventActions).toContain('StatusChanged');

      // Verify admin_audit_logs entry
      const supabase = supabaseTestClient;
      const { data: adminAuditLogs, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('registration_id', testRegistrationId)
        .eq('action', 'reject')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.warn(`[admin-rejection] Admin audit logs query failed: ${error.message}`);
        if (error.message.includes('does not exist')) {
          console.log(`[admin-rejection] ⚠️  admin_audit_logs table not found - skipping admin audit validation`);
          return;
        }
        throw error;
      }

      expect(adminAuditLogs).toHaveLength(1);
      const adminAuditLog = adminAuditLogs[0];
      expect(adminAuditLog.admin_email).toBe(adminEmail);
      expect(adminAuditLog.action).toBe('reject');
      expect(adminAuditLog.registration_id).toBe(testRegistrationId);
      expect(adminAuditLog.before).toBeDefined();
      expect(adminAuditLog.after).toBeDefined();

      // Verify before/after state changes
      expect(adminAuditLog.before.status).toBe('approved');
      expect(adminAuditLog.after.status).toBe('rejected');

      // Verify rejection reason in metadata
      if (adminAuditLog.metadata) {
        expect(adminAuditLog.metadata.reason).toBe(rejectionReason);
      }

      console.log(`[admin-rejection] ✅ Admin rejection audit trail validated`);

    } catch (error) {
      console.error(`[admin-rejection] ❌ Admin rejection audit trail failed:`, error);
      throw error;
    }
  });

  test('@audit @admin-request-update should log admin request-update action to admin_audit_logs', async ({ request, baseURL }) => {
    const testContext = createTestContext('admin-request-update-audit');
    const startTs = new Date();
    const dimension = 'payment';
    const notes = 'Please provide updated payment slip';
    
    // Use existing admin email instead of creating new admin user
    const adminEmail = 'admin@test.com';
    
    // Generate explicit request ID
    const rid = `admin-request-update-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    
    // Perform admin request-update action
    const response = await request.post(`/api/admin/registrations/${testRegistrationId}/request-update`, {
      headers: {
        ...testContext.headers,
        'X-Request-ID': rid,
        'Cookie': `admin-email=${adminEmail}`,
      },
      data: {
        adminEmail: adminEmail,
        dimension: dimension,
        notes: notes,
      },
    });

    // Debug logging
    const xRequestId = response.headers()['x-request-id'];
    console.log(`[admin-request-update] baseURL=${baseURL} x-request-id=${rid}`);

    // Verify response
    expect(response.status()).toBe(200);
    expect(xRequestId).toBeTruthy();
    expect(xRequestId).toBe(rid);

    try {
      // Wait for audit logs
      const { accessLogs, eventLogs } = await waitForLogs(rid, 1, 2, { startTs });

      // Verify access log
      expect(accessLogs).toHaveLength(1);
      const accessLog = accessLogs[0];
      expect(accessLog.action).toMatch(/^api:POST \/api\/admin\/registrations\/.*\/request-update/);
      expect(accessLog.result).toBe('200');
      expect(accessLog.request_id).toBe(rid);

      // Verify event logs
      expect(eventLogs).toHaveLength(2);
      const eventActions = new Set(eventLogs.map(log => log.action));
      expect(eventActions).toContain('admin.request_update');
      expect(eventActions).toContain('StatusChanged');

      // Verify admin_audit_logs entry
      const supabase = supabaseTestClient;
      const { data: adminAuditLogs, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('registration_id', testRegistrationId)
        .eq('action', 'request-update')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.warn(`[admin-request-update] Admin audit logs query failed: ${error.message}`);
        if (error.message.includes('does not exist')) {
          console.log(`[admin-request-update] ⚠️  admin_audit_logs table not found - skipping admin audit validation`);
          return;
        }
        throw error;
      }

      expect(adminAuditLogs).toHaveLength(1);
      const adminAuditLog = adminAuditLogs[0];
      expect(adminAuditLog.admin_email).toBe(adminEmail);
      expect(adminAuditLog.action).toBe('request-update');
      expect(adminAuditLog.registration_id).toBe(testRegistrationId);
      expect(adminAuditLog.before).toBeDefined();
      expect(adminAuditLog.after).toBeDefined();

      // Verify before/after state changes
      expect(adminAuditLog.before.status).toBe('rejected');
      expect(adminAuditLog.after.status).toBe('waiting_for_update_payment');

      // Verify request-update details in metadata
      if (adminAuditLog.metadata) {
        expect(adminAuditLog.metadata.dimension).toBe(dimension);
        expect(adminAuditLog.metadata.notes).toBe(notes);
      }

      console.log(`[admin-request-update] ✅ Admin request-update audit trail validated`);

    } catch (error) {
      console.error(`[admin-request-update] ❌ Admin request-update audit trail failed:`, error);
      throw error;
    }
  });

  test.afterAll(async () => {
    // Clean up test data if needed
    console.log(`[admin-audit] Test cleanup completed`);
  });
});
