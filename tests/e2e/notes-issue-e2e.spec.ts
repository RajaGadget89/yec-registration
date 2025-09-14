import { test, expect } from '@playwright/test';

/**
 * E2E Test for Notes Issue
 * 
 * This test captures the real-time behavior of the request-update flow
 * to identify where notes are being overridden with "payment"
 */

test.describe('Notes Issue E2E Investigation', () => {
  test('should capture real-time notes override issue', async ({ page, request }) => {
    console.log('🔍 Starting E2E investigation of notes override issue...');

    // 1. Navigate to admin dashboard
    await page.goto('http://localhost:8080/admin');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // 2. Find a registration to test with
    console.log('📋 Looking for a registration to test with...');
    
    // Wait for the registrations table to load
    await page.waitForSelector('[data-testid="registrations-table"]', { timeout: 10000 });
    
    // Get the first registration row
    const firstRow = page.locator('[data-testid="registrations-table"] tbody tr').first();
    await expect(firstRow).toBeVisible();
    
    // Get registration details
    const registrationId = await firstRow.locator('td').nth(1).textContent();
    console.log(`📋 Found registration: ${registrationId}`);
    
    // 3. Click on the registration to open details
    await firstRow.click();
    
    // Wait for details drawer to open
    await page.waitForSelector('[data-testid="details-drawer"]', { timeout: 5000 });
    
    // 4. Find the payment section and click "Request Update"
    console.log('📋 Looking for payment section...');
    
    const paymentSection = page.locator('[data-testid="payment-section"]');
    await expect(paymentSection).toBeVisible();
    
    const requestUpdateButton = paymentSection.locator('button:has-text("Request Update")');
    await expect(requestUpdateButton).toBeVisible();
    
    // 5. Click "Request Update" and fill in notes
    const testNotes = `E2E_TEST_NOTES_${Date.now()}`;
    console.log(`📋 Clicking Request Update with notes: "${testNotes}"`);
    
    await requestUpdateButton.click();
    
    // Wait for the modal to open
    await page.waitForSelector('[data-testid="request-update-modal"]', { timeout: 5000 });
    
    // Fill in the notes
    const notesTextarea = page.locator('[data-testid="request-update-modal"] textarea');
    await expect(notesTextarea).toBeVisible();
    await notesTextarea.fill(testNotes);
    
    // 6. Submit the request
    const submitButton = page.locator('[data-testid="request-update-modal"] button:has-text("Submit")');
    await expect(submitButton).toBeVisible();
    
    // Capture network requests before submitting
    const requests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/admin/registrations/') && request.url().includes('/request-update')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData(),
          headers: request.headers()
        });
      }
    });
    
    const responses: any[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/admin/registrations/') && response.url().includes('/request-update')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers()
        });
      }
    });
    
    // Submit the form
    await submitButton.click();
    
    // Wait for the modal to close
    await page.waitForSelector('[data-testid="request-update-modal"]', { state: 'hidden', timeout: 10000 });
    
    // 7. Capture the network requests and responses
    console.log('📋 Captured network requests:');
    requests.forEach((req, index) => {
      console.log(`   Request ${index + 1}:`);
      console.log(`     URL: ${req.url}`);
      console.log(`     Method: ${req.method}`);
      console.log(`     Post Data: ${req.postData}`);
    });
    
    console.log('📋 Captured network responses:');
    responses.forEach((res, index) => {
      console.log(`   Response ${index + 1}:`);
      console.log(`     URL: ${res.url}`);
      console.log(`     Status: ${res.status}`);
    });
    
    // 8. Check if the registration was updated
    console.log('📋 Checking if registration was updated...');
    
    // Refresh the page to see updated data
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check the registration status
    const updatedRow = page.locator(`[data-testid="registrations-table"] tbody tr:has-text("${registrationId}")`);
    await expect(updatedRow).toBeVisible();
    
    const statusCell = updatedRow.locator('td').nth(2); // Assuming status is in 3rd column
    const status = await statusCell.textContent();
    console.log(`📋 Updated status: ${status}`);
    
    // 9. Check the database directly via API
    console.log('📋 Checking database directly...');
    
    // Extract registration ID from the table
    const regIdMatch = registrationId?.match(/YEC-(\d+)-(\w+)/);
    if (regIdMatch) {
      const regId = regIdMatch[0];
      console.log(`📋 Extracted registration ID: ${regId}`);
      
      // Make API call to check the registration
      const apiResponse = await request.get(`http://localhost:8080/api/admin/registrations/${regId}`);
      const registrationData = await apiResponse.json();
      
      console.log('📋 Database registration data:');
      console.log(`   Status: ${registrationData.status}`);
      console.log(`   Review Checklist:`, registrationData.review_checklist);
      
      if (registrationData.review_checklist && registrationData.review_checklist.payment) {
        const paymentNotes = registrationData.review_checklist.payment.notes;
        console.log(`   Payment Notes: "${paymentNotes}"`);
        
        if (paymentNotes === testNotes) {
          console.log('✅ Notes are correctly stored in database');
        } else if (paymentNotes === 'payment') {
          console.log('❌ Notes were overridden with "payment" in database');
        } else {
          console.log(`❓ Notes are something else: "${paymentNotes}"`);
        }
      }
    }
    
    // 10. Check email outbox for any emails
    console.log('📋 Checking email outbox...');
    
    const outboxResponse = await request.get('http://localhost:8080/api/admin/email-outbox');
    if (outboxResponse.ok()) {
      const outboxData = await outboxResponse.json();
      console.log(`📋 Found ${outboxData.emails?.length || 0} emails in outbox`);
      
      if (outboxData.emails && outboxData.emails.length > 0) {
        const latestEmail = outboxData.emails[0];
        console.log('📋 Latest email:');
        console.log(`   Template: ${latestEmail.template}`);
        console.log(`   Status: ${latestEmail.status}`);
        console.log(`   Payload Notes: "${latestEmail.payload?.notes || 'NOT_FOUND'}"`);
        console.log(`   Payload Dimension: "${latestEmail.payload?.dimension || 'NOT_FOUND'}"`);
        
        if (latestEmail.payload?.notes === testNotes) {
          console.log('✅ Notes are correctly stored in outbox email');
        } else if (latestEmail.payload?.notes === 'payment') {
          console.log('❌ Notes were overridden with "payment" in outbox email');
        } else {
          console.log(`❓ Notes are something else: "${latestEmail.payload?.notes}"`);
        }
      }
    }
    
    // 11. Capture console logs for any errors
    console.log('📋 Checking for console errors...');
    
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(`ERROR: ${msg.text()}`);
      } else if (msg.text().includes('notes') || msg.text().includes('payment')) {
        consoleLogs.push(`${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });
    
    // Wait a bit to capture any delayed console messages
    await page.waitForTimeout(2000);
    
    if (consoleLogs.length > 0) {
      console.log('📋 Console logs related to notes/payment:');
      consoleLogs.forEach(log => console.log(`   ${log}`));
    }
    
    // 12. Final analysis
    console.log('\n📋 FINAL E2E ANALYSIS');
    console.log('======================');
    console.log('🔍 This E2E test captured:');
    console.log('   1. The exact network requests and responses');
    console.log('   2. The database state after the request');
    console.log('   3. The email outbox state');
    console.log('   4. Any console errors or logs');
    console.log('   5. The real-time behavior of the system');
    console.log('');
    console.log('🎯 This will help identify exactly where the notes are being overridden');
  });
  
  test('should test email template rendering with real data', async ({ page, request }) => {
    console.log('🔍 Testing email template rendering with real data...');
    
    // 1. Get a real registration from the database
    const registrationsResponse = await request.get('http://localhost:8080/api/admin/registrations');
    const registrationsData = await registrationsResponse.json();
    
    if (registrationsData.registrations && registrationsData.registrations.length > 0) {
      const testReg = registrationsData.registrations[0];
      console.log(`📋 Using registration: ${testReg.registration_id}`);
      
      // 2. Test the email template rendering with real registration data
      const testNotes = `REAL_DATA_TEST_${Date.now()}`;
      
      const templateTestPayload = {
        templateType: 'update-payment',
        testAll: false,
        customProps: {
          applicantName: `${testReg.first_name} ${testReg.last_name}`,
          trackingCode: testReg.registration_id,
          ctaUrl: `http://localhost:8080/?token=test&dimension=payment`,
          dimension: "payment",
          notes: testNotes,
          supportEmail: "support@example.com",
          priceApplied: testReg.price_applied?.toString() || "0",
          packageName: testReg.selected_package_code || "Standard Package"
        }
      };
      
      console.log(`📋 Testing with real data and notes: "${testNotes}"`);
      
      const templateResponse = await request.post('http://localhost:8080/api/test/email-templates', {
        data: templateTestPayload
      });
      
      if (templateResponse.ok()) {
        const templateResult = await templateResponse.json();
        
        if (templateResult.results && templateResult.results.length > 0) {
          const result = templateResult.results[0];
          console.log(`📋 Template rendering result: ${result.success}`);
          
          if (result.html && result.html.includes(testNotes)) {
            console.log('✅ Notes found in rendered HTML with real data');
          } else {
            console.log('❌ Notes NOT found in rendered HTML with real data');
            
            // Check what's actually in the HTML
            if (result.html) {
              console.log('📋 HTML content analysis:');
              
              if (result.html.includes('หมายเหตุจากทีมงาน')) {
                console.log('✅ Notes section structure exists');
                
                // Extract the notes section
                const notesSectionMatch = result.html.match(/หมายเหตุจากทีมงาน.*?<\/p>/s);
                if (notesSectionMatch) {
                  console.log('📋 Notes section content:');
                  console.log(notesSectionMatch[0]);
                }
              } else {
                console.log('❌ Notes section structure missing');
              }
            }
          }
        }
      }
    }
  });
});
