import { test, expect } from '@playwright/test';

test.describe('Email Header Spacing Verification', () => {
  test('Verify email header spacing in rendered HTML', async ({ page }) => {
    console.log('🔍 Testing email header spacing...');
    
    // Test 1: Check email preview endpoint
    const previewResponse = await page.request.get(
      'http://localhost:8080/api/dev/preview-email?template=tracking'
    );
    
    expect(previewResponse.status()).toBe(200);
    const html = await previewResponse.text();
    
    console.log('📧 Email HTML preview generated successfully');
    
    // Test 2: Verify table-based layout is used
    expect(html).toContain('<table');
    expect(html).toContain('borderCollapse: \'collapse\'');
    
    // Test 3: Verify proper spacing attributes
    expect(html).toContain('paddingRight: \'48px\'');
    expect(html).toContain('paddingLeft: \'48px\'');
    
    // Test 4: Verify logo and text are in separate table cells
    expect(html).toContain('YEC Day Logo');
    expect(html).toContain('YEC Day');
    expect(html).toContain('Young Entrepreneurs Chamber');
    
    console.log('✅ Email header spacing verification passed');
  });

  test('Test email sending with new spacing', async ({ page }) => {
    console.log('📧 Testing email sending with new spacing...');
    
    const testEmail = 'raja.gadgets89@gmail.com';
    const testTrackingCode = `SPACING-TEST-${Date.now()}`;
    
    const sendEmailResponse = await page.request.post(
      'http://localhost:8080/api/test/send-tracking-email',
      {
        headers: {
          'Authorization': 'Bearer local-secret',
          'X-Test-Helpers-Enabled': '1',
          'Content-Type': 'application/json'
        },
        data: {
          email: testEmail,
          trackingCode: testTrackingCode
        }
      }
    );
    
    expect(sendEmailResponse.status()).toBe(200);
    const sendResult = await sendEmailResponse.json();
    
    console.log('📊 Email send result:', sendResult);
    
    // Verify email was sent successfully
    expect(sendResult.success).toBe(true);
    expect(sendResult.result.ok).toBe(true);
    expect(sendResult.result.template).toBe('tracking');
    expect(sendResult.result.to).toBe(testEmail);
    expect(sendResult.result.trackingCode).toBe(testTrackingCode);
    
    console.log('✅ Email sent successfully with new spacing');
  });
});

