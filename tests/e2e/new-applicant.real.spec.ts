import { test, expect } from '@playwright/test';

test.describe('New Applicant E2E: Real Testing with Email', () => {
  test('Real New Applicant: API Registration → DB → Real Email → Telegram', async ({ page }) => {
    const testId = `REAL-TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const testEmail = 'raja.gadgets89@gmail.com'; // Use allowlisted email
    const testNickname = `RealTest${testId.substring(0, 8)}`;
    
    console.log(`🧪 Starting REAL New Applicant E2E test with ID: ${testId}`);
    console.log(`📧 Test email (allowlisted): ${testEmail}`);
    console.log(`🔍 Registration will be easily identifiable with prefix: REAL-TEST-`);
    
    // Step 1: Create registration via API with easily identifiable data
    console.log('📝 Creating REAL registration via API...');
    
    const registrationPayload = {
      title: 'Mr.',
      firstName: 'Real',
      lastName: 'TestUser',
      nickname: testNickname,
      phone: '0812345678',
      lineId: `realtest${testId.substring(0, 8)}`,
      email: testEmail, // Use allowlisted email
      companyName: 'REAL TEST COMPANY',
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
    
    console.log('📊 REAL Registration result:', registrationResult);
    
    expect(registrationResult.success).toBe(true);
    expect(registrationResult.registration_id).toBeTruthy();
    
    const trackingCode = registrationResult.registration_id;
    console.log(`📋 REAL Tracking code: ${trackingCode}`);
    console.log(`📧 REAL Email will be sent to: ${testEmail}`);
    
    // Step 2: Assert DB - Check registration was created with correct status
    console.log('🔍 Checking REAL database registration...');
    
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
    
    console.log('📊 REAL Registration data:', registrationData);
    
    expect(registrationData.status).toBe('waiting_for_review');
    expect(registrationData.tracking_code).toBe(trackingCode);
    expect(registrationData.email).toBe(testEmail);
    expect(registrationData.id).toBeTruthy();
    
    console.log('✅ REAL Database assertion passed');
    console.log(`🔍 You can find this registration in the database with:`);
    console.log(`   - Email: ${testEmail}`);
    console.log(`   - Tracking Code: ${trackingCode}`);
    console.log(`   - Company Name: REAL TEST COMPANY`);
    console.log(`   - Status: waiting_for_review`);
    
    // Step 3: Check if real email was sent
    console.log('📧 Checking if real email was sent...');
    
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
    
    console.log('📊 Email transport stats:', emailDebugData.stats);
    console.log('📊 Email config:', emailDebugData.emailConfig);
    
    // Step 4: Check Telegram notification
    console.log('📱 Checking REAL Telegram outbox...');
    
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
    
    console.log('📊 REAL Telegram outbox data:', telegramData);
    
    // Find our specific registration in the telegram outbox
    const ourTelegramMessage = telegramData.outbox.find((msg: any) => 
      msg.text.includes(trackingCode) && msg.text.includes('REAL TEST COMPANY')
    );
    
    expect(ourTelegramMessage).toBeTruthy();
    console.log('✅ REAL Telegram assertion passed');
    
    // Step 5: Print comprehensive summary
    console.log('🎉 REAL New Applicant E2E Test Summary:');
    console.log(JSON.stringify({
      testId,
      tracking_code: trackingCode,
      email: testEmail,
      status: registrationData.status,
      company_name: 'REAL TEST COMPANY',
      database_id: registrationData.id,
      email_sent: emailDebugData.stats.sent > 0,
      telegram_captured: !!ourTelegramMessage,
      email_transport_stats: emailDebugData.stats,
      instructions: {
        check_email: `Check your email at ${testEmail} for the tracking email`,
        check_database: `Look for registration with email: ${testEmail}`,
        check_telegram: 'Telegram notification captured in test mode'
      }
    }, null, 2));
    
    console.log('✅ REAL New Applicant E2E test completed successfully!');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log(`1. 📧 Check your email at ${testEmail} for the tracking email with template`);
    console.log(`2. 🗄️  Check the database for registration with email: ${testEmail}`);
    console.log(`3. 📱 Telegram notification was captured (test mode)`);
    console.log(`4. 🔍 Registration is easily identifiable with company name: REAL TEST COMPANY`);
  });
});
