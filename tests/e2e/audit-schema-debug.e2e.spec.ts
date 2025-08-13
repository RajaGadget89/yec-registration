import { test, expect } from '@playwright/test';

test.describe('Audit Schema Debug & Setup', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:8080');
  });

  test('should test audit schema diagnostic endpoint', async ({ page }) => {
    // Test the diagnostic endpoint directly
    const response = await page.request.get('http://localhost:8080/api/diag/audit-schema-test');
    const data = await response.json();
    
    console.log('Audit Schema Diagnostic Response:', JSON.stringify(data, null, 2));
    
    // Log the results for debugging
    if (data.ok) {
      console.log('✅ Diagnostic endpoint is working');
      console.log('📊 Table Status:', data.results.tables);
      console.log('🔐 Table Access:', data.results.table_access);
      console.log('✏️ Insert Test:', data.results.insert_test);
    } else {
      console.log('❌ Diagnostic endpoint failed:', data.error);
    }
    
    // Store the results for later use
    test.info().annotations.push({
      type: 'audit-schema-diagnostic',
      description: JSON.stringify(data)
    });
  });

  test('should test audit smoke endpoint', async ({ page }) => {
    // Test the audit smoke endpoint
    const response = await page.request.get('http://localhost:8080/api/diag/audit-smoke', {
      headers: {
        'X-Request-ID': 'playwright-test-' + Date.now()
      }
    });
    
    const data = await response.json();
    console.log('Audit Smoke Test Response:', JSON.stringify(data, null, 2));
    
    expect(response.ok()).toBeTruthy();
    expect(data.ok).toBeTruthy();
    expect(data.requestId).toBeDefined();
    
    // Store the request ID for later tests
    test.info().annotations.push({
      type: 'audit-smoke-request-id',
      description: data.requestId
    });
  });

  test('should test admin authentication and audit dashboard access', async ({ page }) => {
    // First, try to access the audit dashboard without authentication
    await page.goto('http://localhost:8080/admin/audit');
    
    // Should redirect to login if not authenticated
    const currentUrl = page.url();
    console.log('Current URL after accessing /admin/audit:', currentUrl);
    
    if (currentUrl.includes('/admin/login')) {
      console.log('✅ Properly redirected to login page');
      
      // Try to login (this might need adjustment based on your auth setup)
      await page.fill('input[type="email"]', 'admin@example.com');
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      
      // Wait for redirect
      await page.waitForURL('**/admin/audit', { timeout: 10000 });
    } else {
      console.log('⚠️ Not redirected to login - might already be authenticated');
    }
    
    // Now check the audit dashboard
    await page.waitForSelector('h1:has-text("Audit Dashboard")', { timeout: 10000 });
    
    // Check if the status message is present
    const statusMessage = await page.locator('text=Audit System Status').isVisible();
    console.log('Status message visible:', statusMessage);
    
    if (statusMessage) {
      const statusText = await page.locator('text=No audit logs found').textContent();
      console.log('Status text:', statusText);
    }
    
    // Check if tables are empty
    const accessLogsCount = await page.locator('text=Access Logs').locator('..').locator('text=/\\d+/').textContent();
    const eventLogsCount = await page.locator('text=Event Logs').locator('..').locator('text=/\\d+/').textContent();
    
    console.log('Access Logs Count:', accessLogsCount);
    console.log('Event Logs Count:', eventLogsCount);
  });

  test('should test database connection and schema verification', async ({ page }) => {
    // This test will help verify if the issue is with the database connection
    // or with the specific audit schema
    
    // Test a simple health check endpoint if available
    try {
      const healthResponse = await page.request.get('http://localhost:8080/api/health');
      const healthData = await healthResponse.json();
      console.log('Health Check Response:', JSON.stringify(healthData, null, 2));
    } catch (error) {
      console.log('Health check endpoint not available or failed');
    }
    
    // Test whoami endpoint to check authentication
    try {
      const whoamiResponse = await page.request.get('http://localhost:8080/api/whoami');
      const whoamiData = await whoamiResponse.json();
      console.log('Whoami Response:', JSON.stringify(whoamiData, null, 2));
    } catch (error) {
      console.log('Whoami endpoint not available or failed');
    }
  });

  test('should generate test audit data and verify', async ({ page }) => {
    // Generate multiple audit events
    const requestIds = [];
    
    for (let i = 0; i < 3; i++) {
      const requestId = `playwright-batch-test-${Date.now()}-${i}`;
      requestIds.push(requestId);
      
      const response = await page.request.get('http://localhost:8080/api/diag/audit-smoke', {
        headers: {
          'X-Request-ID': requestId
        }
      });
      
      const data = await response.json();
      console.log(`Generated audit event ${i + 1}:`, data.requestId);
      
      // Wait a bit between requests
      await page.waitForTimeout(1000);
    }
    
    // Wait for data to be processed
    await page.waitForTimeout(2000);
    
    // Test the diagnostic endpoint again to see if data was created
    const diagnosticResponse = await page.request.get('http://localhost:8080/api/diag/audit-schema-test');
    const diagnosticData = await diagnosticResponse.json();
    
    console.log('Diagnostic after generating data:', JSON.stringify(diagnosticData, null, 2));
    
    // Store the request IDs for manual verification
    test.info().annotations.push({
      type: 'generated-request-ids',
      description: JSON.stringify(requestIds)
    });
  });

  test('should test admin audit dashboard with specific request ID', async ({ page }) => {
    // Generate a specific request ID for testing
    const testRequestId = `playwright-specific-test-${Date.now()}`;
    
    // Generate audit data
    const response = await page.request.get('http://localhost:8080/api/diag/audit-smoke', {
      headers: {
        'X-Request-ID': testRequestId
      }
    });
    
    const data = await response.json();
    console.log('Generated test data with request ID:', testRequestId);
    
    // Wait for data processing
    await page.waitForTimeout(2000);
    
    // Navigate to audit dashboard with specific request ID filter
    await page.goto(`http://localhost:8080/admin/audit?request_id=${testRequestId}`);
    
    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Audit Dashboard")', { timeout: 10000 });
    
    // Check if the request ID filter is applied
    const requestIdInput = await page.locator('input[placeholder*="request ID"]');
    const inputValue = await requestIdInput.inputValue();
    console.log('Request ID filter value:', inputValue);
    
    // Check if any logs are displayed
    const hasLogs = await page.locator('text=No access logs found').isVisible();
    console.log('No logs message visible:', hasLogs);
    
    // Check tab counts
    const accessLogsTab = await page.locator('text=Access Logs').locator('..');
    const eventLogsTab = await page.locator('text=Event Logs').locator('..');
    
    const accessCount = await accessLogsTab.locator('text=/\\d+/').textContent();
    const eventCount = await eventLogsTab.locator('text=/\\d+/').textContent();
    
    console.log('Access Logs Count with filter:', accessCount);
    console.log('Event Logs Count with filter:', eventCount);
    
    // Store test results
    test.info().annotations.push({
      type: 'specific-request-test',
      description: JSON.stringify({
        requestId: testRequestId,
        accessCount,
        eventCount,
        hasNoLogsMessage: hasLogs
      })
    });
  });

  test('should test CSV export functionality', async ({ page }) => {
    // Test CSV export endpoints
    const exportTypes = ['access', 'event'];
    
    for (const type of exportTypes) {
      try {
        const response = await page.request.get(`http://localhost:8080/admin/audit/export?type=${type}`);
        
        console.log(`${type.toUpperCase()} CSV Export Status:`, response.status());
        console.log(`${type.toUpperCase()} CSV Export Headers:`, response.headers());
        
        if (response.ok()) {
          const content = await response.text();
          console.log(`${type.toUpperCase()} CSV Content (first 200 chars):`, content.substring(0, 200));
        } else {
          console.log(`${type.toUpperCase()} CSV Export failed:`, response.statusText());
        }
      } catch (error) {
        console.log(`${type.toUpperCase()} CSV Export error:`, error);
      }
    }
  });

  test('should provide comprehensive debug report', async ({ page }) => {
    // This test will collect all the debug information and provide a comprehensive report
    
    const debugReport = {
      timestamp: new Date().toISOString(),
      environment: {
        url: 'http://localhost:8080',
        userAgent: await page.evaluate(() => navigator.userAgent)
      },
      tests: []
    };
    
    // Test 1: Basic connectivity
    try {
      const response = await page.request.get('http://localhost:8080');
      debugReport.tests.push({
        name: 'Basic Connectivity',
        status: response.ok() ? 'PASS' : 'FAIL',
        statusCode: response.status(),
        details: response.ok() ? 'Application is accessible' : 'Application not accessible'
      });
    } catch (error) {
      debugReport.tests.push({
        name: 'Basic Connectivity',
        status: 'FAIL',
        error: error.message
      });
    }
    
    // Test 2: Audit Schema Diagnostic
    try {
      const response = await page.request.get('http://localhost:8080/api/diag/audit-schema-test');
      const data = await response.json();
      debugReport.tests.push({
        name: 'Audit Schema Diagnostic',
        status: data.ok ? 'PASS' : 'FAIL',
        details: data.results,
        error: data.error
      });
    } catch (error) {
      debugReport.tests.push({
        name: 'Audit Schema Diagnostic',
        status: 'FAIL',
        error: error.message
      });
    }
    
    // Test 3: Audit Smoke Test
    try {
      const response = await page.request.get('http://localhost:8080/api/diag/audit-smoke', {
        headers: { 'X-Request-ID': 'debug-test-' + Date.now() }
      });
      const data = await response.json();
      debugReport.tests.push({
        name: 'Audit Smoke Test',
        status: data.ok ? 'PASS' : 'FAIL',
        details: data
      });
    } catch (error) {
      debugReport.tests.push({
        name: 'Audit Smoke Test',
        status: 'FAIL',
        error: error.message
      });
    }
    
    // Test 4: Admin Dashboard Access
    try {
      await page.goto('http://localhost:8080/admin/audit');
      const currentUrl = page.url();
      const hasStatusMessage = await page.locator('text=Audit System Status').isVisible();
      
      debugReport.tests.push({
        name: 'Admin Dashboard Access',
        status: 'PASS',
        details: {
          currentUrl,
          hasStatusMessage,
          redirected: currentUrl.includes('/admin/login')
        }
      });
    } catch (error) {
      debugReport.tests.push({
        name: 'Admin Dashboard Access',
        status: 'FAIL',
        error: error.message
      });
    }
    
    // Log the comprehensive report
    console.log('🔍 COMPREHENSIVE DEBUG REPORT:');
    console.log(JSON.stringify(debugReport, null, 2));
    
    // Store the report
    test.info().annotations.push({
      type: 'debug-report',
      description: JSON.stringify(debugReport)
    });
    
    // Provide actionable recommendations
    const failedTests = debugReport.tests.filter(t => t.status === 'FAIL');
    if (failedTests.length > 0) {
      console.log('❌ FAILED TESTS:');
      failedTests.forEach(test => {
        console.log(`- ${test.name}: ${test.error || test.details}`);
      });
    }
    
    const passedTests = debugReport.tests.filter(t => t.status === 'PASS');
    console.log(`✅ PASSED TESTS: ${passedTests.length}/${debugReport.tests.length}`);
  });
});
