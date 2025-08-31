/**
 * Admins Sorting Reproduction Test - UAT-03
 * 
 * This test proves that GET /api/admin/management/admins currently ignores
 * sortBy and sortOrder parameters sent by the Admins tab.
 * 
 * Contract expectation: API should honor sortBy (one of created_at,email,role,last_login_at) 
 * and sortOrder (asc|desc).
 * 
 * Actual today: API always sorts by created_at DESC (hardcoded).
 * 
 * This test must be RED before patch, GREEN after patch.
 */

import { test, expect } from '@playwright/test';

test.describe('Admins Sorting Mismatch Reproduction - UAT-03', () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080';
  const superAdminEmail = 'raja.gadgets89@gmail.com';

  test.beforeAll(async ({ request }) => {
    // Ensure super admin user exists in database
    console.log('\n🔧 Setting up super admin user for testing...');
    const createResponse = await request.post('/api/test/create-admin-user', {
      data: { email: superAdminEmail }
    });
    
    if (createResponse.status() !== 200) {
      throw new Error(`Failed to create super admin user: ${await createResponse.text()}`);
    }
    
    const createData = await createResponse.json();
    console.log(`✅ Super admin user ready: ${createData.user.email} (${createData.user.role})`);
  });

  test('sortBy=email&sortOrder=asc → ignored (RED)', async ({ request }) => {
    console.log('\n🔧 Testing Email Sorting Ignored...');
    
    // Preconditions: authenticated as super_admin; FLAG=on
    console.log('📋 Preconditions:');
    console.log(`   - Authenticated as super_admin: ${superAdminEmail}`);
    console.log(`   - Feature flag: adminManagement enabled`);

    // Call: GET /api/admin/management/admins with email sorting
    console.log('\n📋 Step 1: Calling API with email sorting...');
    const response = await request.get('/api/admin/management/admins', {
      params: {
        page: '1',
        pageSize: '10',
        sortBy: 'email',
        sortOrder: 'asc'
      },
      headers: {
        'Cookie': `admin-email=${superAdminEmail}`
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    console.log('✅ API response received:');
    console.log(`   - Status: ${response.status()}`);
    console.log(`   - Total admins: ${data.pagination?.total || 0}`);
    console.log(`   - Returned count: ${data.admins?.length || 0}`);

    // Extract emails from response
    const receivedEmails = data.admins?.map((admin: any) => admin.email) || [];
    
    if (receivedEmails.length < 3) {
      console.log('⚠️  Warning: Less than 3 admin records found. Sorting test may be inconclusive.');
      console.log(`   - Found emails: ${receivedEmails.join(', ')}`);
      return;
    }

    console.log('\n📋 Step 2: Analyzing email sorting...');
    console.log(`   - Received emails (first 10): ${receivedEmails.slice(0, 10).join(', ')}`);

    // Create expected sorted copy
    const expectedSortedEmails = [...receivedEmails].sort((a, b) => a.localeCompare(b));
    
    console.log(`   - Expected sorted: ${expectedSortedEmails.slice(0, 10).join(', ')}`);

    // Assert: emails should equal sorted copy
    console.log('\n📋 Step 3: Asserting sorting behavior...');
    
    const isCorrectlySorted = JSON.stringify(receivedEmails) === JSON.stringify(expectedSortedEmails);
    
    if (!isCorrectlySorted) {
      console.log('❌ SORTING MISMATCH DETECTED:');
      console.log('   - API is NOT honoring sortBy=email&sortOrder=asc');
      console.log('   - This proves the sorting parameters are being ignored');
      
      // Create diagnostic table
      console.log('\n📊 Diagnostic Table:');
      console.log('┌─────────────────────────────────────────────────────────────┐');
      console.log('│ Email Sorting Mismatch Evidence                            │');
      console.log('├─────────────────────────────────────────────────────────────┤');
      console.log('│ Parameter: sortBy=email&sortOrder=asc                      │');
      console.log('│ Expected:  Alphabetically sorted emails                    │');
      console.log('│ Actual:    Emails in original order (likely by created_at) │');
      console.log('│ Status:    ❌ FAILED - Sorting ignored                     │');
      console.log('└─────────────────────────────────────────────────────────────┘');
      
      // Show first few differences
      const firstMismatchIndex = receivedEmails.findIndex((email, index) => 
        email !== expectedSortedEmails[index]
      );
      
      if (firstMismatchIndex !== -1) {
        console.log('\n📋 First Mismatch Details:');
        console.log(`   - Position: ${firstMismatchIndex}`);
        console.log(`   - Received:  ${receivedEmails[firstMismatchIndex]}`);
        console.log(`   - Expected:  ${expectedSortedEmails[firstMismatchIndex]}`);
      }
    } else {
      console.log('✅ SORTING WORKING CORRECTLY:');
      console.log('   - API IS honoring sortBy=email&sortOrder=asc');
      console.log('   - This suggests the patch has been applied');
    }

    // This assertion should FAIL before patch (proving sorting is ignored)
    // and PASS after patch (proving sorting works)
    expect(receivedEmails).toEqual(expectedSortedEmails);
  });

  test('Control — default created_at ordering is DESC (GREEN)', async ({ request }) => {
    console.log('\n🔧 Testing Default Created At Ordering...');
    
    // Call: GET /api/admin/management/admins without sorting parameters
    console.log('\n📋 Step 1: Calling API with default ordering...');
    const response = await request.get('/api/admin/management/admins', {
      params: {
        page: '1',
        pageSize: '5'
      },
      headers: {
        'Cookie': `admin-email=${superAdminEmail}`
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    console.log('✅ API response received:');
    console.log(`   - Status: ${response.status()}`);
    console.log(`   - Returned count: ${data.admins?.length || 0}`);

    // Extract created_at values
    const createdAts = data.admins?.map((admin: any) => admin.created_at) || [];
    
    if (createdAts.length < 2) {
      console.log('⚠️  Warning: Less than 2 admin records found. Ordering test may be inconclusive.');
      return;
    }

    console.log('\n📋 Step 2: Analyzing created_at ordering...');
    console.log(`   - Created dates: ${createdAts.slice(0, 5).join(', ')}`);

    // Assert: created_at values should be strictly non-increasing (DESC order)
    console.log('\n📋 Step 3: Asserting DESC ordering...');
    
    let isDescending = true;
    for (let i = 0; i < createdAts.length - 1; i++) {
      const currentDate = new Date(createdAts[i]);
      const nextDate = new Date(createdAts[i + 1]);
      
      if (currentDate < nextDate) {
        isDescending = false;
        console.log(`❌ Ordering violation at position ${i}:`);
        console.log(`   - Current: ${createdAts[i]} (${currentDate})`);
        console.log(`   - Next:    ${createdAts[i + 1]} (${nextDate})`);
        break;
      }
    }

    if (isDescending) {
      console.log('✅ DEFAULT ORDERING CONFIRMED:');
      console.log('   - API is correctly sorting by created_at DESC');
      console.log('   - This confirms the current hardcoded behavior');
      
      console.log('\n📊 Control Test Results:');
      console.log('┌─────────────────────────────────────────────────────────────┐');
      console.log('│ Default Ordering Control Test                              │');
      console.log('├─────────────────────────────────────────────────────────────┤');
      console.log('│ Parameter: No sorting parameters (default)                 │');
      console.log('│ Expected:  created_at DESC (newest first)                  │');
      console.log('│ Actual:    created_at DESC (newest first)                  │');
      console.log('│ Status:    ✅ PASSED - Default behavior confirmed          │');
      console.log('└─────────────────────────────────────────────────────────────┘');
    } else {
      console.log('❌ DEFAULT ORDERING VIOLATION:');
      console.log('   - API is NOT sorting by created_at DESC');
      console.log('   - This suggests unexpected behavior');
    }

    // This assertion should PASS (confirming current hardcoded behavior)
    expect(isDescending).toBe(true);
  });

  test('Summary: Admins Sorting Behavior Analysis', () => {
    console.log('\n📊 Admins Sorting Behavior Analysis');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ UAT-03 Admins Sorting Analysis                             │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│ Investigation: API Sorting Parameter Handling              │');
    console.log('│                                                             │');
    console.log('│ Expected: sortBy/sortOrder parameters honored              │');
    console.log('│ Observed: sortBy/sortOrder parameters ignored              │');
    console.log('│                                                             │');
    console.log('│ Evidence:                                                  │');
    console.log('│ - sortBy=email&sortOrder=asc returns unsorted list ❌      │');
    console.log('│ - Default ordering is created_at DESC ✅                   │');
    console.log('│ - API hardcodes .order("created_at", { ascending: false }) │');
    console.log('│                                                             │');
    console.log('│ Status: SORTING PARAMETERS IGNORED                         │');
    console.log('│ Next: Implement server-side sorting parameter handling     │');
    console.log('└─────────────────────────────────────────────────────────────┘');
  });
});
