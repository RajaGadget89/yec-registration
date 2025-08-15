import { test, expect } from '@playwright/test';

test.describe('Email System Verification', () => {
  test('Verify email configuration is working', async ({ page }) => {
    // Test 1: Check email debug endpoint
    console.log('🔍 Testing email configuration...');
    
    const emailDebugResponse = await page.request.get(
      'http://localhost:8080/api/test/email-debug',
      {
        headers: {
          'Authorization': 'Bearer local-secret',
          'X-Test-Helpers-Enabled': '1'
        }
      }
    );
    
    expect(emailDebugResponse.status()).toBe(200);
    const emailDebugData = await emailDebugResponse.json();
    
    console.log('📊 Email debug data:', emailDebugData);
    
    // Verify email configuration is properly set
    expect(emailDebugData.emailConfig.hasEmailConfig).toBe(true);
    expect(emailDebugData.environment.FROM_EMAIL).toBe('info@yecday.com');
    expect(emailDebugData.environment.EMAIL_MODE).toBe('CAPPED');
    
    console.log('✅ Email configuration verified');
  });

  test('Test tracking email sending', async ({ page }) => {
    // Test 2: Send a test tracking email
    console.log('📧 Testing tracking email sending...');
    
    const testEmail = 'raja.gadgets89@gmail.com';
    const testTrackingCode = `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
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
    
    console.log('✅ Tracking email sent successfully');
  });

  test('Test new registration with email', async ({ page }) => {
    // Test 3: Complete registration flow with email verification
    console.log('🔄 Testing complete registration flow with email...');
    
    const testId = `EMAIL-TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const testEmail = 'raja.gadgets89@gmail.com';
    
    // Step 1: Submit registration
    const registrationData = {
      title: 'Mr.',
      firstName: 'Email',
      lastName: 'Test',
      nickname: 'EmailTest',
      phone: '0812345678',
      lineId: 'emailtest',
      email: testEmail,
      companyName: `${testId} COMPANY`,
      businessType: 'technology',
      yecProvince: 'bangkok',
      travelType: 'self',
      hotelChoice: 'external',
      external_hotel_name: 'Test Hotel',
      roomType: 'single',
      roommatePhone: '',
      profileImage: null,
      chamberCard: null,
      paymentSlip: null,
      pdpaConsent: true
    };
    
    const registrationResponse = await page.request.post(
      'http://localhost:8080/api/register',
      {
        headers: {
          'Content-Type': 'application/json'
        },
        data: registrationData
      }
    );
    
    expect(registrationResponse.status()).toBe(200);
    const registrationResult = await registrationResponse.json();
    
    console.log('📋 Registration result:', registrationResult);
    
    expect(registrationResult.success).toBe(true);
    expect(registrationResult.registration_id).toBeTruthy();
    
    const trackingCode = registrationResult.registration_id;
    console.log(`📋 Tracking code: ${trackingCode}`);
    
    // Step 2: Check if email was sent
    console.log('📧 Checking if email was sent...');
    
    // Wait a moment for email processing
    await page.waitForTimeout(2000);
    
    const emailDebugResponse = await page.request.get(
      'http://localhost:8080/api/test/email-debug',
      {
        headers: {
          'Authorization': 'Bearer local-secret',
          'X-Test-Helpers-Enabled': '1'
        }
      }
    );
    
    expect(emailDebugResponse.status()).toBe(200);
    const emailDebugData = await emailDebugResponse.json();
    
    console.log('📊 Final email stats:', emailDebugData.stats);
    
    // Verify email was sent
    expect(emailDebugData.stats.sent).toBeGreaterThan(0);
    expect(emailDebugData.stats.errors).toBe(0);
    
    console.log('✅ Complete registration flow with email verified');
  });
});

