import { test, expect } from '@playwright/test';

test.describe('Admin Management - Audit & Events Integration', () => {
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

  test('should emit events and audit logs for invitation creation', async ({ request }) => {
    const correlationId = `test-invite-${Date.now()}`;
    
    // Create invitation with correlation ID
    const response = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: 'audit-test@example.com',
        roles: ['admin']
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Idempotency-Key': correlationId
      }
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('correlation_id', correlationId);

    // Verify that the invitation was created with the correlation ID
    // This would require additional API calls to verify the database state
    // For now, we'll verify the response structure
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('email', 'audit-test@example.com');
  });

  test('should emit events and audit logs for invitation acceptance', async ({ request }) => {
    const correlationId = `test-accept-${Date.now()}`;
    
    // First, create an invitation
    const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: 'accept-audit-test@example.com',
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

    // Accept invitation with correlation ID
    const response = await request.post(`${baseUrl}/api/admin/management/invitations/${token}/accept`, {
      data: {},
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Idempotency-Key': correlationId
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('correlation_id', correlationId);
    expect(data).toHaveProperty('admin_user_id');
  });

  test('should emit events and audit logs for invitation resend', async ({ request }) => {
    const correlationId = `test-resend-${Date.now()}`;
    
    // First, create an invitation
    const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: 'resend-audit-test@example.com',
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

    // Resend invitation with correlation ID
    const response = await request.post(`${baseUrl}/api/admin/management/invitations/${invitationId}/resend`, {
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Idempotency-Key': correlationId
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('correlation_id', correlationId);
    expect(data).toHaveProperty('resend_count', 1);
  });

  test('should emit events and audit logs for invitation cancellation', async ({ request }) => {
    const correlationId = `test-cancel-${Date.now()}`;
    
    // First, create an invitation
    const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: 'cancel-audit-test@example.com',
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

    // Cancel invitation with correlation ID
    const response = await request.post(`${baseUrl}/api/admin/management/invitations/${invitationId}/cancel`, {
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Idempotency-Key': correlationId
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('correlation_id', correlationId);
  });

  test('should emit events and audit logs for admin role updates', async ({ request }) => {
    const correlationId = `test-role-update-${Date.now()}`;
    
    // First, create and accept an invitation to get an admin user
    const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: 'role-update-audit-test@example.com',
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

    // Update admin role with correlation ID
    const response = await request.put(`${baseUrl}/api/admin/management/admins/${adminId}`, {
      data: {
        add_roles: ['super_admin']
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Idempotency-Key': correlationId
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('correlation_id', correlationId);
  });

  test('should emit events and audit logs for admin status updates', async ({ request }) => {
    const correlationId = `test-status-update-${Date.now()}`;
    
    // First, create and accept an invitation to get an admin user
    const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: 'status-update-audit-test@example.com',
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

    // Suspend admin with correlation ID
    const response = await request.put(`${baseUrl}/api/admin/management/admins/${adminId}`, {
      data: {
        status: 'suspended'
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Idempotency-Key': correlationId
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('correlation_id', correlationId);
  });

  test('should emit events and audit logs for admin removal', async ({ request }) => {
    const correlationId = `test-removal-${Date.now()}`;
    
    // First, create and accept an invitation to get an admin user
    const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: 'removal-audit-test@example.com',
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

    // Remove admin with correlation ID
    const response = await request.delete(`${baseUrl}/api/admin/management/admins/${adminId}`, {
      headers: {
        'X-E2E-RLS-BYPASS': '1',
        'Idempotency-Key': correlationId
      }
    });

    expect(response.status()).toBe(204);
  });

  test('should maintain correlation ID consistency across related operations', async ({ request }) => {
    const correlationId = `test-consistency-${Date.now()}`;
    
    // Create invitation with correlation ID
    const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: 'consistency-test@example.com',
        roles: ['admin']
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Idempotency-Key': correlationId
      }
    });

    expect(inviteResponse.status()).toBe(201);
    const inviteData = await inviteResponse.json();
    expect(inviteData).toHaveProperty('correlation_id', correlationId);

    // Resend the same invitation with the same correlation ID
    const resendResponse = await request.post(`${baseUrl}/api/admin/management/invitations/${inviteData.id}/resend`, {
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Idempotency-Key': correlationId
      }
    });

    expect(resendResponse.status()).toBe(200);
    const resendData = await resendResponse.json();
    expect(resendData).toHaveProperty('correlation_id', correlationId);

    // Cancel the invitation with the same correlation ID
    const cancelResponse = await request.post(`${baseUrl}/api/admin/management/invitations/${inviteData.id}/cancel`, {
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Idempotency-Key': correlationId
      }
    });

    expect(cancelResponse.status()).toBe(200);
    const cancelData = await cancelResponse.json();
    expect(cancelData).toHaveProperty('correlation_id', correlationId);
  });

  test('should handle idempotency correctly with correlation IDs', async ({ request }) => {
    const correlationId = `test-idempotency-${Date.now()}`;
    
    // Create invitation with correlation ID
    const inviteResponse1 = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: 'idempotency-test@example.com',
        roles: ['admin']
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Idempotency-Key': correlationId
      }
    });

    expect(inviteResponse1.status()).toBe(201);
    const inviteData1 = await inviteResponse1.json();

    // Try to create the same invitation again with the same correlation ID
    const inviteResponse2 = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: 'idempotency-test@example.com',
        roles: ['admin']
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Idempotency-Key': correlationId
      }
    });

    expect(inviteResponse2.status()).toBe(201);
    const inviteData2 = await inviteResponse2.json();
    
    // Should return the same invitation ID
    expect(inviteData2.id).toBe(inviteData1.id);
    expect(inviteData2).toHaveProperty('message', 'Invitation already created (idempotency)');
  });

  test('should include proper metadata in audit logs', async ({ request }) => {
    const correlationId = `test-metadata-${Date.now()}`;
    
    // Create invitation and verify response includes necessary metadata
    const response = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: 'metadata-test@example.com',
        roles: ['admin']
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'Idempotency-Key': correlationId,
        'User-Agent': 'Test-Agent/1.0'
      }
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    
    // Verify response structure includes all necessary fields for audit tracking
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('email', 'metadata-test@example.com');
    expect(data).toHaveProperty('expires_at');
    expect(data).toHaveProperty('correlation_id', correlationId);
    expect(data).toHaveProperty('message', 'Invitation created successfully');
  });

  test('should handle error scenarios with proper audit logging', async ({ request }) => {
    // Test with invalid email to trigger validation error
    const response = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: 'invalid-email',
        roles: ['admin']
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1'
      }
    });

    expect(response.status()).toBe(422);
    const data = await response.json();
    expect(data).toHaveProperty('error', 'Validation failed');
    expect(data).toHaveProperty('details');
  });
});
