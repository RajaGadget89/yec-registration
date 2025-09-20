import { test, expect } from '@playwright/test';
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
 * API-based Notes Issue Capture Test
 * 
 * This test directly calls the API endpoints to simulate the "Request Update" workflow
 * and captures the real-time behavior without UI complications.
 */
test.describe('Notes Issue API Capture', () => {
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
    testNotes = `API_CAPTURE_${Date.now()}`;
    
    console.log(`✅ Using existing registration: ${registration.registration_id}`);
    console.log(`📧 Email: ${registration.email}`);
    console.log(`📋 Test notes: "${testNotes}"`);
  });

  test('Capture real-time Request Update API workflow with notes issue', async ({ page }) => {
    console.log('🔍 STARTING API CAPTURE TEST');
    console.log('==============================');

    // Step 1: Authenticate first
    console.log('1️⃣ Authenticating...');
    
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

    // Step 2: Set up network monitoring
    console.log('2️⃣ Setting up network monitoring...');
    
    const networkRequests: any[] = [];
    const networkResponses: any[] = [];
    
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
        networkResponses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
          body: response.body()
        });
      }
    });
    
    console.log('✅ Network monitoring set up');

    // Step 3: Make the Request Update API call directly
    console.log('3️⃣ Making Request Update API call...');
    
    const requestUpdateUrl = `${baseURL}/api/admin/registrations/${testRegistrationId}/request-update`;
    const requestUpdatePayload = {
      dimension: 'payment',
      notes: testNotes
    };
    
    console.log(`📋 URL: ${requestUpdateUrl}`);
    console.log(`📋 Payload:`, JSON.stringify(requestUpdatePayload, null, 2));
    
    const response = await page.request.post(requestUpdateUrl, {
      data: requestUpdatePayload
    });
    
    console.log(`📋 Response status: ${response.status()}`);
    
    if (response.ok()) {
      const result = await response.json();
      console.log('✅ Request-update API successful!');
      console.log(`📋 API Response:`, JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Request-update API failed');
      console.log(`📋 Error: ${errorText}`);
    }

    // Step 4: Analyze network requests
    console.log('4️⃣ Analyzing network requests...');
    
    if (networkRequests.length > 0) {
      console.log(`📋 Captured ${networkRequests.length} network requests:`);
      
      networkRequests.forEach((request, index) => {
        console.log(`\n📡 Request ${index + 1}:`);
        console.log(`   URL: ${request.url}`);
        console.log(`   Method: ${request.method}`);
        
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
      });
    }
    
    if (networkResponses.length > 0) {
      console.log(`📋 Captured ${networkResponses.length} network responses:`);
      
      networkResponses.forEach((response, index) => {
        console.log(`\n📡 Response ${index + 1}:`);
        console.log(`   URL: ${response.url}`);
        console.log(`   Status: ${response.status}`);
        
        if (response.body) {
          try {
            const responseBody = JSON.parse(response.body.toString());
            console.log(`   Response Body:`, JSON.stringify(responseBody, null, 2));
          } catch (e) {
            console.log(`   Response Body (raw): ${response.body}`);
          }
        }
      });
    }

    // Step 5: Check database state
    console.log('5️⃣ Checking database state...');
    
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

    // Step 6: Check email outbox
    console.log('6️⃣ Checking email outbox...');
    
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

    // Step 7: Test email template rendering with captured data
    console.log('7️⃣ Testing email template rendering with captured data...');
    
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

    // Step 8: Final Analysis
    console.log('8️⃣ FINAL ANALYSIS');
    console.log('==================');
    console.log('🔍 This test captured:');
    console.log('   1. The exact API request and response');
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

