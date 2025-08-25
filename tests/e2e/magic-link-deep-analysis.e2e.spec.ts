import { test, expect, Page } from '@playwright/test';
import { MagicLinkAnalyzer } from './helpers/magicLinkAnalyzer';
import { ErrorCapture } from './helpers/errorCapture';

/**
 * Magic Link Deep Analysis E2E Test
 * 
 * This comprehensive testing tool captures ALL runtime errors and provides deep analysis
 * of the magic link authentication issue that has been blocking the project for 30+ hours.
 * 
 * Key Features:
 * - Real email magic link simulation
 * - Comprehensive error capture and logging
 * - Environment-specific testing (staging vs production)
 * - Token analysis and validation
 * - Session establishment verification
 * - DNS resolution testing
 * - Rate limiting detection
 * - Detailed reporting and analysis
 */

test.describe('Magic Link Deep Analysis - Comprehensive Error Capture', () => {
  let page: Page;
  let analyzer: MagicLinkAnalyzer;
  let errorCapture: ErrorCapture;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    analyzer = new MagicLinkAnalyzer(page);
    errorCapture = new ErrorCapture(page);
    
    // Enable comprehensive error capture
    await errorCapture.enableFullCapture();
    
    console.log('[Deep Analysis] 🚀 Starting comprehensive magic link analysis');
    console.log('[Deep Analysis] Environment:', process.env.NODE_ENV);
    console.log('[Deep Analysis] App URL:', process.env.NEXT_PUBLIC_APP_URL);
    console.log('[Deep Analysis] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  });

  test('should capture complete magic link flow with comprehensive error analysis', async () => {
    console.log('[Deep Analysis] 📋 Test 1: Complete Magic Link Flow Analysis');
    
    const testResults = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      steps: [] as any[],
      errors: [] as any[],
      warnings: [] as any[],
      networkRequests: [] as any[],
      redirects: [] as any[],
      sessionState: null as any,
      finalUrl: '',
      success: false
    };

    try {
      // Step 1: Environment Validation
      console.log('[Deep Analysis] 🔍 Step 1: Environment Validation');
      const envValidation = await analyzer.validateEnvironment();
      testResults.steps.push({
        step: 'Environment Validation',
        timestamp: new Date().toISOString(),
        result: envValidation
      });

      if (!envValidation.valid) {
        console.error('[Deep Analysis] ❌ Environment validation failed:', envValidation.errors);
        testResults.errors.push({
          type: 'Environment Validation',
          message: 'Environment configuration is invalid',
          details: envValidation.errors
        });
      }

      // Step 2: Navigate to Admin Login
      console.log('[Deep Analysis] 🔐 Step 2: Admin Login Page Access');
      await page.goto('http://localhost:8080/admin/login');
      
      const loginPageValidation = await analyzer.validateLoginPage();
      testResults.steps.push({
        step: 'Login Page Access',
        timestamp: new Date().toISOString(),
        result: loginPageValidation
      });

      // Step 3: Generate Magic Link via API
      console.log('[Deep Analysis] 📧 Step 3: Magic Link Generation via API');
      const magicLinkData = await analyzer.generateMagicLinkViaAPI('raja.gadgets89@gmail.com');
      testResults.steps.push({
        step: 'Magic Link Generation',
        timestamp: new Date().toISOString(),
        result: magicLinkData
      });

      if (!magicLinkData.success) {
        console.error('[Deep Analysis] ❌ Magic link generation failed:', magicLinkData.error);
        testResults.errors.push({
          type: 'Magic Link Generation',
          message: 'Failed to generate magic link via API',
          details: magicLinkData.error
        });
        return;
      }

      // Step 4: Analyze Magic Link URL
      console.log('[Deep Analysis] 🔗 Step 4: Magic Link URL Analysis');
      const urlAnalysis = await analyzer.analyzeMagicLinkUrl(magicLinkData.actionLink);
      testResults.steps.push({
        step: 'Magic Link URL Analysis',
        timestamp: new Date().toISOString(),
        result: urlAnalysis
      });

      // Step 5: Click Magic Link (Simulate Real User Behavior)
      console.log('[Deep Analysis] 🖱️ Step 5: Clicking Magic Link (Real User Simulation)');
      const clickResult = await analyzer.clickMagicLink(magicLinkData.actionLink);
      testResults.steps.push({
        step: 'Magic Link Click',
        timestamp: new Date().toISOString(),
        result: clickResult
      });

      // Step 6: Capture All Network Activity
      console.log('[Deep Analysis] 🌐 Step 6: Network Activity Capture');
      const networkActivity = await errorCapture.captureNetworkActivity();
      testResults.networkRequests = networkActivity;

      // Step 7: Analyze Redirects
      console.log('[Deep Analysis] 🔄 Step 7: Redirect Analysis');
      const redirectAnalysis = await analyzer.analyzeRedirects();
      testResults.redirects = redirectAnalysis;

      // Step 8: Check Final URL and State
      console.log('[Deep Analysis] 🎯 Step 8: Final State Analysis');
      const finalUrl = page.url();
      testResults.finalUrl = finalUrl;

      const finalStateAnalysis = await analyzer.analyzeFinalState();
      testResults.steps.push({
        step: 'Final State Analysis',
        timestamp: new Date().toISOString(),
        result: finalStateAnalysis
      });

      // Step 9: Session Verification
      console.log('[Deep Analysis] 🔑 Step 9: Session Verification');
      const sessionVerification = await analyzer.verifySession();
      testResults.sessionState = sessionVerification;
      testResults.steps.push({
        step: 'Session Verification',
        timestamp: new Date().toISOString(),
        result: sessionVerification
      });

      // Step 10: Error Analysis
      console.log('[Deep Analysis] ⚠️ Step 10: Error Analysis');
      const capturedErrors = await errorCapture.getCapturedErrors();
      testResults.errors = [...testResults.errors, ...capturedErrors];

      const capturedWarnings = await errorCapture.getCapturedWarnings();
      testResults.warnings = capturedWarnings;

      // Step 11: Success Determination
      testResults.success = finalStateAnalysis.isAuthenticated && 
                           sessionVerification.hasValidSession &&
                           !finalUrl.includes('%2A.vercel.app');

      console.log('[Deep Analysis] 📊 Test Results Summary:');
      console.log('[Deep Analysis] - Success:', testResults.success);
      console.log('[Deep Analysis] - Final URL:', testResults.finalUrl);
      console.log('[Deep Analysis] - Errors Found:', testResults.errors.length);
      console.log('[Deep Analysis] - Warnings Found:', testResults.warnings.length);
      console.log('[Deep Analysis] - Network Requests:', testResults.networkRequests.length);
      console.log('[Deep Analysis] - Redirects:', testResults.redirects.length);

    } catch (error) {
      console.error('[Deep Analysis] 💥 Unexpected error during analysis:', error);
      testResults.errors.push({
        type: 'Unexpected Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }

    // Generate comprehensive report
    await analyzer.generateAnalysisReport(testResults);
  });

  test('should test rate limiting and token expiration scenarios', async () => {
    console.log('[Deep Analysis] 📋 Test 2: Rate Limiting and Token Expiration Analysis');
    
    // Test rate limiting
    console.log('[Deep Analysis] ⏱️ Testing rate limiting scenarios');
    const rateLimitTest = await analyzer.testRateLimiting();
    
    // Test token expiration
    console.log('[Deep Analysis] ⏰ Testing token expiration scenarios');
    const tokenExpirationTest = await analyzer.testTokenExpiration();
    
    // Generate rate limiting and expiration report
    await analyzer.generateRateLimitReport({
      rateLimiting: rateLimitTest,
      tokenExpiration: tokenExpirationTest
    });
  });

  test('should test DNS resolution and malformed URL scenarios', async () => {
    console.log('[Deep Analysis] 📋 Test 3: DNS Resolution and Malformed URL Analysis');
    
    // Test DNS resolution
    console.log('[Deep Analysis] 🌐 Testing DNS resolution');
    const dnsTest = await analyzer.testDNSResolution();
    
    // Test malformed URL handling
    console.log('[Deep Analysis] 🔗 Testing malformed URL handling');
    const malformedUrlTest = await analyzer.testMalformedUrlHandling();
    
    // Generate DNS and URL report
    await analyzer.generateDNSReport({
      dnsResolution: dnsTest,
      malformedUrls: malformedUrlTest
    });
  });

  test('should test environment-specific configurations', async () => {
    console.log('[Deep Analysis] 📋 Test 4: Environment Configuration Analysis');
    
    // Test staging environment
    console.log('[Deep Analysis] 🏗️ Testing staging environment configuration');
    const stagingTest = await analyzer.testStagingEnvironment();
    
    // Test production environment simulation
    console.log('[Deep Analysis] 🚀 Testing production environment simulation');
    const productionTest = await analyzer.testProductionEnvironment();
    
    // Generate environment comparison report
    await analyzer.generateEnvironmentReport({
      staging: stagingTest,
      production: productionTest
    });
  });

  test('should test cross-browser and mobile compatibility', async () => {
    console.log('[Deep Analysis] 📋 Test 5: Cross-Browser and Mobile Compatibility');
    
    // Test different user agents
    console.log('[Deep Analysis] 🌐 Testing different user agents');
    const userAgentTest = await analyzer.testUserAgents();
    
    // Test mobile viewport
    console.log('[Deep Analysis] 📱 Testing mobile viewport');
    const mobileTest = await analyzer.testMobileViewport();
    
    // Generate compatibility report
    await analyzer.generateCompatibilityReport({
      userAgents: userAgentTest,
      mobile: mobileTest
    });
  });

  test.afterEach(async () => {
    // Clean up and finalize reports
    console.log('[Deep Analysis] 🧹 Cleaning up test artifacts');
    await analyzer.cleanup();
    await errorCapture.cleanup();
  });
});

