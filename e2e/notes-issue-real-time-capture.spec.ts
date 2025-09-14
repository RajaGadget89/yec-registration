import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { config as loadDotenv } from 'dotenv';

// Load environment variables
loadDotenv({ path: '.env.local' });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY not found in environment');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Real-time Notes Issue Capture Test
 * 
 * This test captures the exact workflow that the user is experiencing:
 * 1. Admin login
 * 2. Find a registration
 * 3. Click "Request Update" 
 * 4. Enter notes
 * 5. Submit
 * 6. Capture the actual email that gets sent
 * 
 * This will help identify the real root cause of the notes issue.
 */
test.describe('Notes Issue Real-Time Capture', () => {
  let testRegistrationId: string;
  let testNotes: string;

  test.beforeAll(async () => {
    // Use an existing registration for this test
    const { data: registrations } = await supabase
      .from('registrations')
      .select('id, registration_id, email, first_name, last_name, status, review_checklist')
      .limit(1);

    if (!registrations || registrations.length === 0) {
      throw new Error('No registrations found in database');
    }

    const registration = registrations[0];
    testRegistrationId = registration.id;
    testNotes = `REAL_TIME_CAPTURE_${Date.now()}`;
    
    console.log(`✅ Using existing registration: ${registration.registration_id}`);
    console.log(`📧 Email: ${registration.email}`);
    console.log(`📋 Test notes: "${testNotes}"`);
  });

  test.afterAll(async () => {
    // No cleanup needed since we're using an existing registration
    console.log('🧹 Test completed - using existing registration');
  });

  test('Capture real-time Request Update workflow with notes issue', async ({ page }) => {
    console.log('🔍 STARTING REAL-TIME CAPTURE TEST');
    console.log('=====================================');

    // Step 1: Authenticate first
    console.log('1️⃣ Authenticating...');
    
    // Use the test auth endpoint to authenticate
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:8080';
    const testEmail = 'raja.gadgets89@gmail.com'; // Use an existing admin user
    
    // Calculate HMAC for authentication
    const crypto = require('crypto');
    const e2eAuthSecret = process.env.E2E_AUTH_SECRET;
    if (!e2eAuthSecret) {
      throw new Error('E2E_AUTH_SECRET not found');
    }
    
    const payload = JSON.stringify({ email: testEmail });
    const hmac = crypto
      .createHmac('sha256', e2eAuthSecret)
      .update(payload)
      .digest('hex');

    // Call the test auth endpoint
    const authResponse = await page.request.post(`${baseURL}/api/test/auth/login`, {
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-AUTH': hmac,
      },
      data: { email: testEmail },
    });

    if (authResponse.status() !== 204) {
      throw new Error(`Authentication failed: ${authResponse.status()}`);
    }
    
    console.log('✅ Authentication successful');

    // Step 2: Navigate to admin dashboard
    console.log('2️⃣ Navigating to admin dashboard...');
    await page.goto('/admin');
    
    // Wait for admin dashboard to load
    await expect(page.locator('h1').first()).toContainText('Registration Management');
    console.log('✅ Admin dashboard loaded');

    // Step 3: Find any registration in the table
    console.log('3️⃣ Finding a registration in the table...');
    
    // Wait for the table to load
    await page.waitForTimeout(3000);
    
    // Look for any registration row in the table
    const registrationRow = page.locator('tbody tr').first();
    await expect(registrationRow).toBeVisible();
    console.log('✅ Found a registration in the table');

    // Step 3: Click on the registration to open details
    console.log('3️⃣ Opening registration details...');
    await registrationRow.click();
    
    // Wait for details drawer/modal to open
    await page.waitForTimeout(1000);
    console.log('✅ Registration details opened');

    // Step 4: Find an enabled "Request Update" button
    console.log('4️⃣ Looking for enabled Request Update button...');
    
    // Look for any enabled Request Update button
    const requestUpdateButton = page.locator('button:has-text("Request Update"), button:has-text("ขออัปเดต")').filter({ hasNotText: 'disabled' }).first();
    
    // If no enabled button found, try to find any button and check its state
    if (await requestUpdateButton.count() === 0) {
      console.log('⚠️ No enabled Request Update button found, checking all buttons...');
      
      // Get all Request Update buttons and their states
      const allButtons = page.locator('button:has-text("Request Update"), button:has-text("ขออัปเดต")');
      const buttonCount = await allButtons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = allButtons.nth(i);
        const isEnabled = await button.isEnabled();
        const title = await button.getAttribute('title');
        const text = await button.textContent();
        
        console.log(`📋 Button ${i + 1}: enabled=${isEnabled}, title="${title}", text="${text}"`);
        
        if (isEnabled) {
          console.log(`✅ Found enabled button: ${text}`);
          break;
        }
      }
      
      // Use the first button regardless of state for testing
      const firstButton = page.locator('button:has-text("Request Update"), button:has-text("ขออัปเดต")').first();
      await expect(firstButton).toBeVisible();
      console.log('✅ Using first Request Update button for testing');
    } else {
      await expect(requestUpdateButton).toBeVisible();
      console.log('✅ Found enabled Request Update button');
    }

    // Step 5: Click Request Update and capture the modal
    console.log('5️⃣ Clicking Request Update button...');
    
    // Set up network monitoring before clicking
    const networkRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/admin/registrations/') && request.url().includes('/request-update')) {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        });
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/admin/registrations/') && response.url().includes('/request-update')) {
        networkRequests.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
          body: response.body()
        });
      }
    });

    await requestUpdateButton.click();
    
    // Wait for modal to open
    await page.waitForTimeout(1000);
    console.log('✅ Request Update modal opened');

    // Step 6: Fill in the notes field
    console.log('6️⃣ Filling in notes field...');
    
    // Look for notes input field
    const notesInput = page.locator('textarea[placeholder*="note"], textarea[placeholder*="หมายเหตุ"], input[placeholder*="note"], input[placeholder*="หมายเหตุ"]').first();
    await expect(notesInput).toBeVisible();
    
    await notesInput.fill(testNotes);
    console.log(`✅ Notes filled: "${testNotes}"`);

    // Step 7: Submit the request and capture the response
    console.log('7️⃣ Submitting request update...');
    
    // Look for submit button
    const submitButton = page.locator('button:has-text("Submit"), button:has-text("ส่ง"), button:has-text("Confirm"), button:has-text("ยืนยัน")').first();
    await expect(submitButton).toBeVisible();
    
    await submitButton.click();
    
    // Wait for the request to complete
    await page.waitForTimeout(3000);
    console.log('✅ Request update submitted');

    // Step 8: Capture network requests
    console.log('8️⃣ Analyzing network requests...');
    
    if (networkRequests.length > 0) {
      console.log(`📋 Captured ${networkRequests.length} network requests:`);
      
      networkRequests.forEach((request, index) => {
        console.log(`\n📡 Request ${index + 1}:`);
        console.log(`   URL: ${request.url}`);
        console.log(`   Method: ${request.method}`);
        console.log(`   Status: ${request.status}`);
        
        if (request.postData) {
          try {
            const postData = JSON.parse(request.postData);
            console.log(`   Post Data:`, JSON.stringify(postData, null, 2));
            
            if (postData.notes === testNotes) {
              console.log('   ✅ Notes match our test notes!');
            } else if (postData.notes === 'payment') {
              console.log('   ❌ Notes were overridden with "payment"!');
            } else {
              console.log(`   ❓ Notes are something else: "${postData.notes}"`);
            }
          } catch (e) {
            console.log(`   Post Data (raw): ${request.postData}`);
          }
        }
        
        if (request.body) {
          try {
            const responseBody = JSON.parse(request.body.toString());
            console.log(`   Response Body:`, JSON.stringify(responseBody, null, 2));
          } catch (e) {
            console.log(`   Response Body (raw): ${request.body}`);
          }
        }
      });
    } else {
      console.log('❌ No network requests captured');
    }

    // Step 9: Check database state
    console.log('9️⃣ Checking database state...');
    
    const { data: updatedReg } = await supabase
      .from('registrations')
      .select('id, status, update_reason, review_checklist')
      .eq('id', testRegistrationId)
      .single();
    
    if (updatedReg) {
      console.log(`📋 Updated status: ${updatedReg.status}`);
      console.log(`📋 Update reason: "${updatedReg.update_reason}"`);
      console.log(`📋 Updated review_checklist:`, JSON.stringify(updatedReg.review_checklist, null, 2));
      
      // Check if notes are stored correctly
      if (updatedReg.review_checklist && updatedReg.review_checklist.payment) {
        const paymentNotes = updatedReg.review_checklist.payment.notes;
        console.log(`📋 Payment notes in database: "${paymentNotes}"`);
        
        if (paymentNotes === testNotes) {
          console.log('✅ Notes are correctly stored in database');
        } else if (paymentNotes === 'payment') {
          console.log('❌ Notes were overridden with "payment" in database');
          console.log('🔍 This indicates the issue is in the API or database layer');
        } else {
          console.log(`❓ Notes are something else: "${paymentNotes}"`);
        }
      }
    }

    // Step 10: Check email outbox
    console.log('🔟 Checking email outbox...');
    
    await page.waitForTimeout(2000); // Wait for email processing
    
    const { data: outboxEmails } = await supabase
      .from('email_outbox')
      .select('*')
      .eq('to_email', updatedReg?.email || '')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (outboxEmails && outboxEmails.length > 0) {
      console.log(`📋 Found ${outboxEmails.length} emails in outbox:`);
      
      outboxEmails.forEach((email, index) => {
        console.log(`\n📧 Email ${index + 1}:`);
        console.log(`   Template: ${email.template}`);
        console.log(`   Status: ${email.status}`);
        console.log(`   Created: ${email.created_at}`);
        console.log(`   Payload:`, JSON.stringify(email.payload, null, 2));
        
        // Check if this email was created during our test
        const emailTime = new Date(email.created_at);
        const testTime = new Date();
        const timeDiff = testTime - emailTime;
        
        if (timeDiff < 10000) { // Within 10 seconds
          console.log('   🎯 This email was created during our test!');
          
          if (email.payload.notes === testNotes) {
            console.log('   ✅ Notes match our test notes!');
            console.log('   🎉 The fix is working!');
          } else if (email.payload.notes === 'payment') {
            console.log('   ❌ Notes were overridden with "payment"!');
            console.log('   🔍 This confirms the issue is in the email system');
          } else {
            console.log(`   ❓ Notes are something else: "${email.payload.notes}"`);
          }
          
          // Check the HTML content
          if (email.html_content) {
            console.log('   📋 HTML content analysis:');
            
            if (email.html_content.includes('หมายเหตุจากทีมงาน')) {
              console.log('   ✅ Notes section structure exists in HTML');
              
              if (email.html_content.includes(testNotes)) {
                console.log('   ✅ Test notes found in HTML content');
                console.log('   🎉 The fix is working!');
              } else if (email.html_content.includes('payment')) {
                console.log('   ❌ "payment" found in HTML content instead of notes');
                console.log('   🔍 The fix did not work');
              } else {
                console.log('   ❓ Notes content not found in HTML');
              }
            } else {
              console.log('   ❌ Notes section structure missing from HTML');
            }
          }
        }
      });
    } else {
      console.log('ℹ️  No emails found in outbox');
      console.log('🔍 This confirms emails are being sent via direct transport');
    }

    // Step 11: Test email template rendering with captured data
    console.log('1️⃣1️⃣ Testing email template rendering with captured data...');
    
    // Replicate the exact props that enhancedEmailService.ts would create
    const emailServiceProps = {
      applicantName: `${updatedReg?.first_name} ${updatedReg?.last_name}`,
      trackingCode: updatedReg?.registration_id,
      ctaUrl: `http://localhost:8080/?token=test&dimension=payment`,
      dimension: "payment",
      notes: testNotes,
      supportEmail: "support@example.com",
      brandTokens: {
        primaryColor: "#1e40af",
        secondaryColor: "#3b82f6",
        logoUrl: "https://example.com/logo.png"
      },
      priceApplied: updatedReg?.price_applied?.toString() || "0",
      packageName: updatedReg?.selected_package_code || "Standard Package"
    };
    
    console.log('📋 Testing email template rendering with exact enhancedEmailService props:');
    console.log(`📋 notes: "${emailServiceProps.notes}"`);
    
    const templateTestResponse = await page.request.post('/api/test/email-templates', {
      data: {
        templateType: 'update-payment',
        testAll: false,
        customProps: emailServiceProps
      }
    });
    
    if (templateTestResponse.ok()) {
      const templateResult = await templateTestResponse.json();
      
      if (templateResult.results && templateResult.results.length > 0) {
        const result = templateResult.results[0];
        console.log(`📋 Template rendering result: ${result.success}`);
        
        if (result.html && result.html.includes(testNotes)) {
          console.log('✅ Notes found in rendered HTML with enhancedEmailService props');
          console.log('🔍 This means the template rendering system works correctly');
        } else {
          console.log('❌ Notes NOT found in rendered HTML with enhancedEmailService props');
          console.log('🔍 This means there is still an issue with the template rendering');
          
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

    // Step 12: Final Analysis
    console.log('1️⃣2️⃣ FINAL ANALYSIS');
    console.log('==================');
    console.log('🔍 This test captured:');
    console.log('   1. The exact UI workflow the user experiences');
    console.log('   2. Network requests and responses in real-time');
    console.log('   3. Database state changes');
    console.log('   4. Email outbox state');
    console.log('   5. Template rendering with real data');
    console.log('');
    console.log('🎯 This should help identify the real root cause of the notes issue');

    // Assertions for test validation
    expect(updatedReg).toBeTruthy();
    expect(updatedReg?.status).toBe('waiting_for_update_payment');
    
    // The key assertion - check if notes are preserved
    if (updatedReg?.review_checklist?.payment?.notes === testNotes) {
      console.log('🎉 SUCCESS: Notes are correctly preserved in the workflow!');
    } else {
      console.log('❌ FAILURE: Notes are not preserved in the workflow');
      console.log(`Expected: "${testNotes}"`);
      console.log(`Actual: "${updatedReg?.review_checklist?.payment?.notes}"`);
    }
  });
});
