import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('New Applicant E2E: Complete Workflow', () => {
  test('New Applicant: API Registration → DB → Event → Telegram', async ({ page }) => {
    const testId = `newapp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const testEmail = `test-${testId}@example.com`;
    const testNickname = `Test${testId.substring(0, 8)}`;
    
    console.log(`🧪 Starting New Applicant E2E test with ID: ${testId}`);
    console.log(`📧 Test email: ${testEmail}`);
    
    // Step 1: Create registration via API (bypass form validation)
    console.log('📝 Creating registration via API...');
    
    const registrationPayload = {
      title: 'Mr.',
      firstName: 'Test',
      lastName: 'User',
      nickname: testNickname,
      phone: '0812345678',
      lineId: `test${testId.substring(0, 8)}`,
      email: testEmail,
      companyName: 'Test Company',
      businessType: 'technology',
      yecProvince: 'bangkok',
      hotelChoice: 'in-quota',
      roomType: 'single',
      travelType: 'private-car',
      profileImage: 'https://example.com/profile.jpg',
      chamberCard: 'https://example.com/chamber.jpg',
      paymentSlip: 'https://example.com/payment.png'
    };
    
    const registrationResponse = await page.request.post(
      'http://localhost:8080/api/register',
      {
        data: registrationPayload
      }
    );
    
    expect(registrationResponse.status()).toBe(200);
    const registrationResult = await registrationResponse.json();
    
    console.log('📊 Registration result:', registrationResult);
    
    expect(registrationResult.success).toBe(true);
    expect(registrationResult.registration_id).toBeTruthy();
    
    const trackingCode = registrationResult.registration_id;
    console.log(`📋 Tracking code: ${trackingCode}`);
    
    // Step 2: Assert DB - Check registration was created with correct status
    console.log('🔍 Checking database registration...');
    
    const peekResponse = await page.request.get(
      `http://localhost:8080/api/test/peek-registration?tracking_code=${trackingCode}`,
      {
        headers: {
          'Authorization': 'Bearer local-secret',
          'X-Test-Helpers-Enabled': '1'
        }
      }
    );
    
    expect(peekResponse.status()).toBe(200);
    const registrationData = await peekResponse.json();
    
    console.log('📊 Registration data:', registrationData);
    
    expect(registrationData.status).toBe('waiting_for_review');
    expect(registrationData.tracking_code).toBe(trackingCode);
    expect(registrationData.email).toBe(testEmail);
    expect(registrationData.id).toBeTruthy();
    
    console.log('✅ Database assertion passed');
    
    // Step 3: Manually trigger event to test Telegram notification
    console.log('📧 Manually triggering registration event...');
    
    const eventResponse = await page.request.post(
      'http://localhost:8080/api/test/test-event',
      {
        headers: {
          'Authorization': 'Bearer local-secret',
          'X-Test-Helpers-Enabled': '1',
          'Content-Type': 'application/json'
        },
        data: {
          registration: {
            id: registrationData.id,
            registration_id: trackingCode,
            title: 'Mr.',
            first_name: 'Test',
            last_name: 'User',
            email: testEmail,
            yec_province: 'bangkok',
            company_name: 'Test Company',
            business_type: 'technology'
          }
        }
      }
    );
    
    expect(eventResponse.status()).toBe(200);
    const eventResult = await eventResponse.json();
    console.log('📊 Event result:', eventResult);
    
    expect(eventResult.success).toBe(true);
    expect(eventResult.results).toHaveLength(5); // 5 handlers should be called
    
    // Step 4: Assert Telegram notification
    console.log('📱 Checking Telegram outbox...');
    
    const telegramResponse = await page.request.get(
      'http://localhost:8080/api/test/telegram-outbox',
      {
        headers: {
          'Authorization': 'Bearer local-secret',
          'X-Test-Helpers-Enabled': '1'
        }
      }
    );
    
    expect(telegramResponse.status()).toBe(200);
    const telegramData = await telegramResponse.json();
    
    console.log('📊 Telegram outbox data:', telegramData);
    
    // Expect at least one Telegram payload
    expect(telegramData.count).toBeGreaterThanOrEqual(1);
    expect(telegramData.latestPayload).toBeTruthy();
    
    // Check that the latest payload contains our test data
    const latestPayload = telegramData.latestPayload;
    expect(latestPayload.text).toContain(testEmail);
    expect(latestPayload.text).toContain(trackingCode);
    expect(latestPayload.text).toContain('Test User');
    expect(latestPayload.text).toContain('Test Company');
    expect(latestPayload.text).toContain('technology');
    
    console.log('✅ Telegram assertion passed');
    
    // Step 5: Final summary
    const summary = {
      tracking_code: trackingCode,
      status: registrationData.status,
      event_results: eventResult.results.length,
      telegram_payload_preview: {
        text: latestPayload.text.substring(0, 100) + '...',
        success: latestPayload.success,
        messageId: latestPayload.messageId
      }
    };
    
    console.log('🎉 New Applicant E2E Test Summary:');
    console.log(JSON.stringify(summary, null, 2));
    
    console.log('✅ New Applicant E2E test completed successfully!');
  });
});
