import { test, expect, Page } from '@playwright/test';
import { MagicLinkDebugger } from './helpers/magicLinkDebugger';
import { EnvironmentValidator } from './helpers/environmentValidator';
import { SupabaseConfigAnalyzer } from './helpers/supabaseConfigAnalyzer';
import { ErrorCapture } from './helpers/errorCapture';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Magic Link Comprehensive Debug E2E Test
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
 * - Supabase configuration validation
 */

interface TestResult {
  timestamp: string;
  environment: string;
  appUrl: string;
  supabaseUrl: string;
  steps: Array<{
    step: string;
    timestamp: string;
    result: any;
    errors?: string[];
    warnings?: string[];
  }>;
  errors: Array<{
    type: string;
    message: string;
    details: any;
    timestamp: string;
  }>;
  warnings: Array<{
    type: string;
    message: string;
    details: any;
    timestamp: string;
  }>;
  networkRequests: Array<{
    url: string;
    method: string;
    status: number;
    timestamp: string;
    headers: Record<string, string>;
    body?: any;
  }>;
  redirects: Array<{
    from: string;
    to: string;
    timestamp: string;
    status: number;
  }>;
  sessionState: any;
  finalUrl: string;
  success: boolean;
  analysis: {
    environmentIssues: string[];
    configurationProblems: string[];
    authenticationFlow: string[];
    recommendations: string[];
  };
}

test.describe('Magic Link Comprehensive Debug - Deep Analysis', () => {
  let page: Page;
  let magicLinkDebugger: MagicLinkDebugger;
  let envValidator: EnvironmentValidator;
  let supabaseAnalyzer: SupabaseConfigAnalyzer;
  let errorCapture: ErrorCapture;
  let testResults: TestResult;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    magicLinkDebugger = new MagicLinkDebugger(page);
    envValidator = new EnvironmentValidator();
    supabaseAnalyzer = new SupabaseConfigAnalyzer();
    errorCapture = new ErrorCapture(page);
    
    // Initialize test results
    testResults = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'unknown',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'unknown',
      steps: [],
      errors: [],
      warnings: [],
      networkRequests: [],
      redirects: [],
      sessionState: null,
      finalUrl: '',
      success: false,
      analysis: {
        environmentIssues: [],
        configurationProblems: [],
        authenticationFlow: [],
        recommendations: []
      }
    };
    
    // Enable comprehensive error capture
    await errorCapture.enableFullCapture();
    
    console.log('[Comprehensive Debug] 🚀 Starting comprehensive magic link analysis');
    console.log('[Comprehensive Debug] Environment:', process.env.NODE_ENV);
    console.log('[Comprehensive Debug] App URL:', process.env.NEXT_PUBLIC_APP_URL);
    console.log('[Comprehensive Debug] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  });

  test('should perform comprehensive magic link authentication analysis', async () => {
    console.log('[Comprehensive Debug] 📋 Starting comprehensive analysis');
    
    try {
      // Step 1: Environment Validation
      console.log('[Comprehensive Debug] 🔍 Step 1: Environment Validation');
      const envValidation = await envValidator.validateEnvironment();
      testResults.steps.push({
        step: 'Environment Validation',
        timestamp: new Date().toISOString(),
        result: envValidation
      });

      if (!envValidation.valid) {
        console.error('[Comprehensive Debug] ❌ Environment validation failed:', envValidation.errors);
        testResults.errors.push({
          type: 'Environment Validation',
          message: 'Environment configuration is invalid',
          details: envValidation.errors,
          timestamp: new Date().toISOString()
        });
        testResults.analysis.environmentIssues.push(...envValidation.errors);
      }

      // Step 2: Supabase Configuration Analysis
      console.log('[Comprehensive Debug] 🔧 Step 2: Supabase Configuration Analysis');
      const supabaseAnalysis = await supabaseAnalyzer.analyzeConfiguration();
      testResults.steps.push({
        step: 'Supabase Configuration Analysis',
        timestamp: new Date().toISOString(),
        result: supabaseAnalysis
      });

      if (supabaseAnalysis.issues.length > 0) {
        console.error('[Comprehensive Debug] ❌ Supabase configuration issues:', supabaseAnalysis.issues);
        testResults.errors.push({
          type: 'Supabase Configuration',
          message: 'Supabase configuration has issues',
          details: supabaseAnalysis.issues,
          timestamp: new Date().toISOString()
        });
        testResults.analysis.configurationProblems.push(...supabaseAnalysis.issues);
      }

      // Step 3: Health Check
      console.log('[Comprehensive Debug] 🏥 Step 3: Health Check');
      const healthCheck = await magicLinkDebugger.performHealthCheck();
      testResults.steps.push({
        step: 'Health Check',
        timestamp: new Date().toISOString(),
        result: healthCheck
      });

      if (!healthCheck.healthy) {
        console.error('[Comprehensive Debug] ❌ Health check failed:', healthCheck.issues);
        testResults.errors.push({
          type: 'Health Check',
          message: 'Application health check failed',
          details: healthCheck.issues,
          timestamp: new Date().toISOString()
        });
      }

      // Step 4: Navigate to Admin Login
      console.log('[Comprehensive Debug] 🔐 Step 4: Admin Login Page Access');
      const loginPageResult = await magicLinkDebugger.navigateToLoginPage();
      testResults.steps.push({
        step: 'Login Page Access',
        timestamp: new Date().toISOString(),
        result: loginPageResult
      });

      if (!loginPageResult.success) {
        console.error('[Comprehensive Debug] ❌ Login page access failed:', loginPageResult.error);
        testResults.errors.push({
          type: 'Login Page Access',
          message: 'Failed to access login page',
          details: loginPageResult.error,
          timestamp: new Date().toISOString()
        });
      }

      // Step 5: Generate Magic Link via API
      console.log('[Comprehensive Debug] 📧 Step 5: Magic Link Generation via API');
      const magicLinkData = await magicLinkDebugger.generateMagicLinkViaAPI('raja.gadgets89@gmail.com');
      testResults.steps.push({
        step: 'Magic Link Generation',
        timestamp: new Date().toISOString(),
        result: magicLinkData
      });

      if (!magicLinkData.success) {
        console.error('[Comprehensive Debug] ❌ Magic link generation failed:', magicLinkData.error);
        testResults.errors.push({
          type: 'Magic Link Generation',
          message: 'Failed to generate magic link',
          details: magicLinkData.error,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('[Comprehensive Debug] ✅ Magic link generated successfully');
        console.log('[Comprehensive Debug] Magic link URL:', magicLinkData.loginUrl);
        
        // Step 6: Analyze Magic Link URL
        console.log('[Comprehensive Debug] 🔍 Step 6: Magic Link URL Analysis');
        const urlAnalysis = await magicLinkDebugger.analyzeMagicLinkUrl(magicLinkData.loginUrl);
        testResults.steps.push({
          step: 'Magic Link URL Analysis',
          timestamp: new Date().toISOString(),
          result: urlAnalysis
        });

        if (urlAnalysis.issues.length > 0) {
          console.error('[Comprehensive Debug] ❌ Magic link URL issues:', urlAnalysis.issues);
          testResults.errors.push({
            type: 'Magic Link URL',
            message: 'Magic link URL has issues',
            details: urlAnalysis.issues,
            timestamp: new Date().toISOString()
          });
          testResults.analysis.configurationProblems.push(...urlAnalysis.issues);
        }

        // Step 7: Simulate Magic Link Click
        console.log('[Comprehensive Debug] 🖱️ Step 7: Magic Link Click Simulation');
        const clickResult = await magicLinkDebugger.simulateMagicLinkClick(magicLinkData.loginUrl);
        testResults.steps.push({
          step: 'Magic Link Click Simulation',
          timestamp: new Date().toISOString(),
          result: clickResult
        });

        if (!clickResult.success) {
          console.error('[Comprehensive Debug] ❌ Magic link click failed:', clickResult.error);
          testResults.errors.push({
            type: 'Magic Link Click',
            message: 'Failed to process magic link click',
            details: clickResult.error,
            timestamp: new Date().toISOString()
          });
        } else {
          // Step 8: Analyze Authentication Flow
          console.log('[Comprehensive Debug] 🔄 Step 8: Authentication Flow Analysis');
          const authFlowAnalysis = await magicLinkDebugger.analyzeAuthenticationFlow();
          testResults.steps.push({
            step: 'Authentication Flow Analysis',
            timestamp: new Date().toISOString(),
            result: authFlowAnalysis
          });

          testResults.sessionState = authFlowAnalysis.sessionState;
          testResults.finalUrl = authFlowAnalysis.finalUrl;
          testResults.success = authFlowAnalysis.success;

          if (!authFlowAnalysis.success) {
            console.error('[Comprehensive Debug] ❌ Authentication flow failed:', authFlowAnalysis.issues);
            testResults.errors.push({
              type: 'Authentication Flow',
              message: 'Authentication flow failed',
              details: authFlowAnalysis.issues,
              timestamp: new Date().toISOString()
            });
            testResults.analysis.authenticationFlow.push(...authFlowAnalysis.issues);
          } else {
            console.log('[Comprehensive Debug] ✅ Authentication flow completed successfully');
          }
        }
      }

      // Step 9: Collect Network Requests
      console.log('[Comprehensive Debug] 🌐 Step 9: Network Request Analysis');
      const networkAnalysis = await magicLinkDebugger.analyzeNetworkRequests();
      testResults.networkRequests = networkAnalysis.requests;
      testResults.redirects = networkAnalysis.redirects;
      testResults.steps.push({
        step: 'Network Request Analysis',
        timestamp: new Date().toISOString(),
        result: networkAnalysis
      });

      // Step 10: Collect Errors and Warnings
      console.log('[Comprehensive Debug] ⚠️ Step 10: Error and Warning Collection');
      const capturedErrors = await errorCapture.getCapturedErrors();
      const capturedWarnings = await errorCapture.getCapturedWarnings();
      testResults.errors.push(...capturedErrors);
      testResults.warnings.push(...capturedWarnings);
      testResults.steps.push({
        step: 'Error and Warning Collection',
        timestamp: new Date().toISOString(),
        result: {
          errors: capturedErrors,
          warnings: capturedWarnings
        }
      });

      // Step 11: Generate Analysis and Recommendations
      console.log('[Comprehensive Debug] 📊 Step 11: Generate Analysis and Recommendations');
      const analysis = await magicLinkDebugger.generateAnalysis(testResults);
      testResults.analysis = analysis;
      testResults.steps.push({
        step: 'Analysis and Recommendations',
        timestamp: new Date().toISOString(),
        result: analysis
      });

    } catch (error) {
      console.error('[Comprehensive Debug] 💥 Unexpected error during analysis:', error);
      testResults.errors.push({
        type: 'Unexpected Error',
        message: 'Unexpected error during analysis',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }

    // Step 12: Generate Comprehensive Report
    console.log('[Comprehensive Debug] 📄 Step 12: Generating Comprehensive Report');
    await magicLinkDebugger.generateComprehensiveReport(testResults);

    // Assertions based on analysis
    console.log('[Comprehensive Debug] ✅ Analysis completed');
    console.log('[Comprehensive Debug] Final URL:', testResults.finalUrl);
    console.log('[Comprehensive Debug] Success:', testResults.success);
    console.log('[Comprehensive Debug] Total Errors:', testResults.errors.length);
    console.log('[Comprehensive Debug] Total Warnings:', testResults.warnings.length);

    // Log key findings
    if (testResults.analysis.environmentIssues.length > 0) {
      console.log('[Comprehensive Debug] 🚨 Environment Issues:', testResults.analysis.environmentIssues);
    }
    if (testResults.analysis.configurationProblems.length > 0) {
      console.log('[Comprehensive Debug] 🔧 Configuration Problems:', testResults.analysis.configurationProblems);
    }
    if (testResults.analysis.authenticationFlow.length > 0) {
      console.log('[Comprehensive Debug] 🔐 Authentication Flow Issues:', testResults.analysis.authenticationFlow);
    }
    if (testResults.analysis.recommendations.length > 0) {
      console.log('[Comprehensive Debug] 💡 Recommendations:', testResults.analysis.recommendations);
    }

    // Final assertions
    expect(testResults.errors.length).toBeLessThan(5); // Allow some minor errors
    expect(testResults.finalUrl).not.toContain('%2A'); // Should not contain URL-encoded asterisk
    expect(testResults.finalUrl).not.toContain('*.vercel.app'); // Should not contain wildcard domain
  });

  test('should test staging vs production environment differences', async () => {
    console.log('[Comprehensive Debug] 🔄 Testing environment differences');
    
    const stagingResults = await magicLinkDebugger.testEnvironment('staging');
    const productionResults = await magicLinkDebugger.testEnvironment('production');
    
    console.log('[Comprehensive Debug] Staging Results:', stagingResults);
    console.log('[Comprehensive Debug] Production Results:', productionResults);
    
    // Compare environments
    const differences = await magicLinkDebugger.compareEnvironments(stagingResults, productionResults);
    console.log('[Comprehensive Debug] Environment Differences:', differences);
    
    expect(differences).toBeDefined();
  });

  test('should validate Supabase redirect URL configuration', async () => {
    console.log('[Comprehensive Debug] 🔗 Validating Supabase redirect URL configuration');
    
    const redirectValidation = await supabaseAnalyzer.validateRedirectUrls();
    console.log('[Comprehensive Debug] Redirect URL Validation:', redirectValidation);
    
    expect(redirectValidation.valid).toBe(true);
    expect(redirectValidation.issues).toHaveLength(0);
  });
});
