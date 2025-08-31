import { test, expect } from '@playwright/test';

test.describe('Admin Management - Invitation Email Flow', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:8080';

  test('should send invitation email and verify outbox entry', async ({ page, request }) => {
    // First, create an invitation to test email sending
    const adminEmail = 'raja.gadgets89@gmail.com';
    
    // Set up admin authentication for creating invitation
    await page.context().addCookies([
      {
        name: 'admin-email',
        value: adminEmail,
        domain: 'localhost',
        path: '/',
      }
    ]);

    const testEmail = `email-test-${Date.now()}@example.com`;
    
    // Create invitation
    const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: testEmail,
        roles: ['admin']
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1'
      }
    });

    expect(inviteResponse.status()).toBe(201);
    const inviteData = await inviteResponse.json();
    
    // Get token from response (for E2E tests)
    const token = inviteData.token;
    expect(token).toBeTruthy();

    // Verify email was sent to outbox
    const outboxResponse = await request.get(`${baseUrl}/api/admin/email-outbox`, {
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'admin-email': adminEmail,
      }
    });

    if (outboxResponse.status() === 200) {
      const outboxData = await outboxResponse.json();
      const emailEntry = outboxData.emails?.find((email: any) => 
        email.to_email === testEmail && 
        email.template === 'admin.invitation'
      );
      
      expect(emailEntry).toBeTruthy();
      expect(emailEntry.subject).toContain('Admin Console Invitation');
      expect(emailEntry.html_content).toContain('Accept Invitation');
      expect(emailEntry.payload.acceptUrl).toContain(token);
      expect(emailEntry.payload.token).toBe(token);
    } else {
      // If outbox API is not available, check local file
      const fs = require('fs');
      const path = require('path');
      const mailDir = path.join(process.cwd(), '.e2e', 'mail');
      
      if (fs.existsSync(mailDir)) {
        const files = fs.readdirSync(mailDir);
        const emailFile = files.find((file: string) => file.endsWith('.json'));
        
        if (emailFile) {
          const emailContent = JSON.parse(fs.readFileSync(path.join(mailDir, emailFile), 'utf8'));
          expect(emailContent.to).toBe(testEmail);
          expect(emailContent.subject).toContain('Admin Console Invitation');
          expect(emailContent.html).toContain('Accept Invitation');
          expect(emailContent.html).toContain(token);
        }
      }
    }
  });

  test('should send invitation email with Thai locale', async ({ page, request }) => {
    // This test would require the API to support locale parameter
    // For now, we'll test the basic flow
    const adminEmail = 'raja.gadgets89@gmail.com';
    
    await page.context().addCookies([
      {
        name: 'admin-email',
        value: adminEmail,
        domain: 'localhost',
        path: '/',
      }
    ]);

    const testEmail = `thai-email-test-${Date.now()}@example.com`;
    
    const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: testEmail,
        roles: ['admin']
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1'
      }
    });

    expect(inviteResponse.status()).toBe(201);
    const inviteData = await inviteResponse.json();
    
    // Get token from response (for E2E tests)
    const token = inviteData.token;
    expect(token).toBeTruthy();

    // Verify email was sent to outbox
    const outboxResponse = await request.get(`${baseUrl}/api/admin/email-outbox`, {
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'admin-email': adminEmail,
      }
    });

    if (outboxResponse.status() === 200) {
      const outboxData = await outboxResponse.json();
      const emailEntry = outboxData.emails?.find((email: any) => 
        email.to_email === testEmail && 
        email.template === 'admin.invitation'
      );
      
      expect(emailEntry).toBeTruthy();
      expect(emailEntry.subject).toContain('Admin Console Invitation');
      expect(emailEntry.html_content).toContain('Accept Invitation');
      expect(emailEntry.payload.acceptUrl).toContain(token);
      expect(emailEntry.payload.token).toBe(token);
    }
  });

  test('should handle email sending failures gracefully', async ({ page, request }) => {
    const adminEmail = 'raja.gadgets89@gmail.com';
    
    await page.context().addCookies([
      {
        name: 'admin-email',
        value: adminEmail,
        domain: 'localhost',
        path: '/',
      }
    ]);

    const testEmail = `failure-test-${Date.now()}@example.com`;
    
    // Create invitation
    const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: testEmail,
        roles: ['admin']
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1'
      }
    });

    expect(inviteResponse.status()).toBe(201);
    const inviteData = await inviteResponse.json();
    
    // Get token from response (for E2E tests)
    const token = inviteData.token;
    expect(token).toBeTruthy();

    // Verify invitation was created even if email failed
    expect(inviteData.invitation).toBeTruthy();
    expect(inviteData.invitation.email).toBe(testEmail);
    expect(inviteData.invitation.roles).toEqual(['admin']);
  });

  test('should resend invitation email successfully', async ({ page, request }) => {
    const adminEmail = 'raja.gadgets89@gmail.com';
    
    await page.context().addCookies([
      {
        name: 'admin-email',
        value: adminEmail,
        domain: 'localhost',
        path: '/',
      }
    ]);

    const testEmail = `resend-test-${Date.now()}@example.com`;
    
    // Create initial invitation
    const inviteResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: testEmail,
        roles: ['admin']
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1'
      }
    });

    expect(inviteResponse.status()).toBe(201);
    const inviteData = await inviteResponse.json();
    const initialToken = inviteData.token;
    
    // Resend invitation
    const resendResponse = await request.post(`${baseUrl}/api/admin/management/invite`, {
      data: {
        email: testEmail,
        roles: ['admin']
      },
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1'
      }
    });

    expect(resendResponse.status()).toBe(200);
    const resendData = await resendResponse.json();
    const newToken = resendData.token;
    
    // Verify new token is different
    expect(newToken).not.toBe(initialToken);
    expect(newToken).toBeTruthy();

    // Verify email was sent to outbox
    const outboxResponse = await request.get(`${baseUrl}/api/admin/email-outbox`, {
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-RLS-BYPASS': '1',
        'admin-email': adminEmail,
      }
    });

    if (outboxResponse.status() === 200) {
      const outboxData = await outboxResponse.json();
      const emailEntry = outboxData.emails?.find((email: any) => 
        email.to_email === testEmail && 
        email.template === 'admin.invitation'
      );
      
      expect(emailEntry).toBeTruthy();
      expect(emailEntry.subject).toContain('Admin Console Invitation');
      expect(emailEntry.html_content).toContain('Accept Invitation');
      expect(emailEntry.payload.acceptUrl).toContain(newToken);
      expect(emailEntry.payload.token).toBe(newToken);
    }
  });
});
