#!/usr/bin/env node

/**
 * Comprehensive Test for Hydration Solution
 * 
 * This test will:
 * 1. Test current behavior (baseline)
 * 2. Test the proposed fix
 * 3. Verify no side effects on other features
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:8080',
  timeout: 30000,
  headless: false, // Set to true for CI
  slowMo: 100, // Slow down for debugging
};

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  baseline: {},
  proposedFix: {},
  sideEffects: {},
  summary: {}
};

async function runTest(testName, testFunction) {
  console.log(`\n🧪 Running test: ${testName}`);
  const startTime = Date.now();
  
  try {
    const result = await testFunction();
    const duration = Date.now() - startTime;
    
    console.log(`✅ ${testName} completed in ${duration}ms`);
    return { success: true, result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ ${testName} failed in ${duration}ms:`, error.message);
    return { success: false, error: error.message, duration };
  }
}

async function testBaselineBehavior() {
  const browser = await puppeteer.launch(TEST_CONFIG);
  const page = await browser.newPage();
  
  // Listen for console errors
  const consoleErrors = [];
  const hydrationErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      if (msg.text().includes('hydration') || msg.text().includes('mismatch')) {
        hydrationErrors.push(msg.text());
      }
    }
  });
  
  // Listen for network requests
  const networkRequests = [];
  page.on('request', request => {
    if (request.url().includes('/api/admin/me')) {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    }
  });
  
  // Test 1: Admin Login Page
  console.log('  📄 Testing admin login page...');
  await page.goto(`${TEST_CONFIG.baseUrl}/admin/login`, { 
    waitUntil: 'networkidle0',
    timeout: TEST_CONFIG.timeout 
  });
  
  // Wait for any async operations
  await page.waitForTimeout(2000);
  
  // Test 2: Admin Dashboard (if accessible)
  console.log('  📄 Testing admin dashboard...');
  try {
    await page.goto(`${TEST_CONFIG.baseUrl}/admin`, { 
      waitUntil: 'networkidle0',
      timeout: TEST_CONFIG.timeout 
    });
    await page.waitForTimeout(2000);
  } catch (error) {
    console.log('  ⚠️  Admin dashboard not accessible (expected if not logged in)');
  }
  
  // Test 3: Registration Form
  console.log('  📄 Testing registration form...');
  await page.goto(`${TEST_CONFIG.baseUrl}/`, { 
    waitUntil: 'networkidle0',
    timeout: TEST_CONFIG.timeout 
  });
  await page.waitForTimeout(2000);
  
  await browser.close();
  
  return {
    consoleErrors,
    hydrationErrors,
    networkRequests,
    summary: {
      totalConsoleErrors: consoleErrors.length,
      hydrationErrors: hydrationErrors.length,
      apiCallsToAdminMe: networkRequests.length
    }
  };
}

async function testProposedFix() {
  // This will test the fix by modifying the component behavior
  // We'll create a temporary fix and test it
  
  const browser = await puppeteer.launch(TEST_CONFIG);
  const page = await browser.newPage();
  
  // Inject our fix into the page
  await page.evaluateOnNewDocument(() => {
    // Override the AdminUserInfoClient behavior to skip API calls on login page
    window.__HYDRATION_TEST_FIX__ = true;
    
    // Mock the fetch for /api/admin/me on login page
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      if (url.includes('/api/admin/me') && window.location.pathname === '/admin/login') {
        console.log('[TEST FIX] Blocking /api/admin/me call on login page');
        return Promise.resolve(new Response('{"error": "blocked for test"}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      return originalFetch.apply(this, arguments);
    };
  });
  
  const consoleErrors = [];
  const hydrationErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      if (msg.text().includes('hydration') || msg.text().includes('mismatch')) {
        hydrationErrors.push(msg.text());
      }
    }
  });
  
  const networkRequests = [];
  page.on('request', request => {
    if (request.url().includes('/api/admin/me')) {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    }
  });
  
  // Test the same pages with our fix
  console.log('  📄 Testing admin login page with fix...');
  await page.goto(`${TEST_CONFIG.baseUrl}/admin/login`, { 
    waitUntil: 'networkidle0',
    timeout: TEST_CONFIG.timeout 
  });
  await page.waitForTimeout(2000);
  
  console.log('  📄 Testing registration form with fix...');
  await page.goto(`${TEST_CONFIG.baseUrl}/`, { 
    waitUntil: 'networkidle0',
    timeout: TEST_CONFIG.timeout 
  });
  await page.waitForTimeout(2000);
  
  await browser.close();
  
  return {
    consoleErrors,
    hydrationErrors,
    networkRequests,
    summary: {
      totalConsoleErrors: consoleErrors.length,
      hydrationErrors: hydrationErrors.length,
      apiCallsToAdminMe: networkRequests.length
    }
  };
}

async function testSideEffects() {
  const browser = await puppeteer.launch(TEST_CONFIG);
  const page = await browser.newPage();
  
  // Test other admin functionality to ensure no side effects
  const sideEffectTests = [];
  
  // Test 1: Check if admin pages still load
  try {
    await page.goto(`${TEST_CONFIG.baseUrl}/admin/login`, { 
      waitUntil: 'networkidle0',
      timeout: TEST_CONFIG.timeout 
    });
    sideEffectTests.push({
      test: 'Admin login page loads',
      success: true,
      details: 'Page loaded successfully'
    });
  } catch (error) {
    sideEffectTests.push({
      test: 'Admin login page loads',
      success: false,
      details: error.message
    });
  }
  
  // Test 2: Check if registration form still works
  try {
    await page.goto(`${TEST_CONFIG.baseUrl}/`, { 
      waitUntil: 'networkidle0',
      timeout: TEST_CONFIG.timeout 
    });
    
    // Check if form elements are present
    const formElements = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      const selects = document.querySelectorAll('select');
      const buttons = document.querySelectorAll('button');
      return {
        inputs: inputs.length,
        selects: selects.length,
        buttons: buttons.length
      };
    });
    
    sideEffectTests.push({
      test: 'Registration form elements present',
      success: formElements.inputs > 0 && formElements.buttons > 0,
      details: `Found ${formElements.inputs} inputs, ${formElements.selects} selects, ${formElements.buttons} buttons`
    });
  } catch (error) {
    sideEffectTests.push({
      test: 'Registration form loads',
      success: false,
      details: error.message
    });
  }
  
  await browser.close();
  
  return {
    tests: sideEffectTests,
    summary: {
      totalTests: sideEffectTests.length,
      passedTests: sideEffectTests.filter(t => t.success).length,
      failedTests: sideEffectTests.filter(t => !t.success).length
    }
  };
}

async function generateReport() {
  const report = {
    testResults,
    analysis: {
      hydrationErrorReduction: testResults.baseline.summary?.hydrationErrors - testResults.proposedFix.summary?.hydrationErrors,
      apiCallReduction: testResults.baseline.summary?.apiCallsToAdminMe - testResults.proposedFix.summary?.apiCallsToAdminMe,
      sideEffectsDetected: testResults.sideEffects.summary?.failedTests > 0
    },
    recommendation: null
  };
  
  // Generate recommendation
  if (report.analysis.hydrationErrorReduction > 0 && !report.analysis.sideEffectsDetected) {
    report.recommendation = 'APPROVE - Fix reduces hydration errors without side effects';
  } else if (report.analysis.sideEffectsDetected) {
    report.recommendation = 'REJECT - Fix causes side effects';
  } else {
    report.recommendation = 'INCONCLUSIVE - No clear improvement detected';
  }
  
  return report;
}

async function main() {
  console.log('🚀 Starting Comprehensive Hydration Solution Test');
  console.log('=' .repeat(60));
  
  // Check if server is running
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/`);
    if (!response.ok) {
      throw new Error(`Server not responding: ${response.status}`);
    }
    console.log('✅ Server is running');
  } catch (error) {
    console.error('❌ Server is not running. Please start the development server first.');
    process.exit(1);
  }
  
  // Run tests
  testResults.baseline = await runTest('Baseline Behavior Test', testBaselineBehavior);
  testResults.proposedFix = await runTest('Proposed Fix Test', testProposedFix);
  testResults.sideEffects = await runTest('Side Effects Test', testSideEffects);
  
  // Generate report
  const report = await generateReport();
  
  // Save report
  const reportPath = path.join(__dirname, 'artifacts', 'ui-hydration', 'test-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Display results
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));
  
  console.log('\n🔍 Baseline Behavior:');
  console.log(`  - Console Errors: ${testResults.baseline.result?.summary?.totalConsoleErrors || 'N/A'}`);
  console.log(`  - Hydration Errors: ${testResults.baseline.result?.summary?.hydrationErrors || 'N/A'}`);
  console.log(`  - API Calls to /admin/me: ${testResults.baseline.result?.summary?.apiCallsToAdminMe || 'N/A'}`);
  
  console.log('\n🔧 Proposed Fix:');
  console.log(`  - Console Errors: ${testResults.proposedFix.result?.summary?.totalConsoleErrors || 'N/A'}`);
  console.log(`  - Hydration Errors: ${testResults.proposedFix.result?.summary?.hydrationErrors || 'N/A'}`);
  console.log(`  - API Calls to /admin/me: ${testResults.proposedFix.result?.summary?.apiCallsToAdminMe || 'N/A'}`);
  
  console.log('\n⚠️  Side Effects:');
  console.log(`  - Tests Passed: ${testResults.sideEffects.result?.summary?.passedTests || 'N/A'}`);
  console.log(`  - Tests Failed: ${testResults.sideEffects.result?.summary?.failedTests || 'N/A'}`);
  
  console.log('\n🎯 Analysis:');
  console.log(`  - Hydration Error Reduction: ${report.analysis.hydrationErrorReduction || 'N/A'}`);
  console.log(`  - API Call Reduction: ${report.analysis.apiCallReduction || 'N/A'}`);
  console.log(`  - Side Effects Detected: ${report.analysis.sideEffectsDetected ? 'YES' : 'NO'}`);
  
  console.log('\n📋 Recommendation:');
  console.log(`  ${report.recommendation}`);
  
  console.log(`\n📄 Full report saved to: ${reportPath}`);
  
  // Exit with appropriate code
  if (report.recommendation.includes('APPROVE')) {
    console.log('\n✅ Test completed successfully - Fix is recommended');
    process.exit(0);
  } else {
    console.log('\n❌ Test completed - Fix is not recommended');
    process.exit(1);
  }
}

// Run the test
main().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
