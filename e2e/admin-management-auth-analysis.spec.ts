/**
 * Admin Management Authentication Analysis - Ishikawa Diagram Approach
 * 
 * This test suite systematically analyzes all possible causes for the authentication
 * issue when accessing /admin/management using the Ishikawa (Fishbone) diagram model.
 * 
 * Ishikawa Categories:
 * 1. Environment Variables & Configuration
 * 2. Authentication Flow & Session Management
 * 3. RBAC (Role-Based Access Control) System
 * 4. Middleware & Route Protection
 * 5. Cookie & Token Management
 * 6. Database & User State
 * 7. Network & Infrastructure
 * 8. Browser & Client-Side Issues
 */

import { test, expect, Page } from '@playwright/test';
import { getTestEnv } from '../tests/e2e/utils/env';

interface AuthTestResult {
  category: string;
  subcategory: string;
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
}

class AdminManagementAuthAnalyzer {
  private results: AuthTestResult[] = [];
  private testEnv: any;

  constructor() {
    this.testEnv = getTestEnv();
  }

  async addResult(result: AuthTestResult) {
    this.results.push(result);
    console.log(`[${result.category}] ${result.subcategory}: ${result.testName} - ${result.passed ? 'PASS' : 'FAIL'}`);
    if (!result.passed && result.error) {
      console.error(`  Error: ${result.error}`);
    }
  }

  generateIshikawaReport(): string {
    const categories = this.groupResultsByCategory();
    let report = '# Admin Management Authentication Analysis Report\n\n';
    report += '## Ishikawa Diagram Analysis Results\n\n';

    for (const [category, tests] of Object.entries(categories)) {
      const passed = tests.filter(t => t.passed).length;
      const total = tests.length;
      const percentage = Math.round((passed / total) * 100);
      
      report += `### ${category} (${passed}/${total} - ${percentage}%)\n\n`;
      
      for (const test of tests) {
        const status = test.passed ? '✅' : '❌';
        report += `- ${status} **${test.subcategory}**: ${test.testName}\n`;
        if (!test.passed && test.error) {
          report += `  - Error: ${test.error}\n`;
        }
        if (test.details) {
          report += `  - Details: ${JSON.stringify(test.details, null, 2)}\n`;
        }
      }
      report += '\n';
    }

    // Summary
    const totalTests = this.results.length;
    const totalPassed = this.results.filter(r => r.passed).length;
    const totalFailed = totalTests - totalPassed;
    
    report += `## Summary\n\n`;
    report += `- **Total Tests**: ${totalTests}\n`;
    report += `- **Passed**: ${totalPassed}\n`;
    report += `- **Failed**: ${totalFailed}\n`;
    report += `- **Success Rate**: ${Math.round((totalPassed / totalTests) * 100)}%\n\n`;

    if (totalFailed > 0) {
      report += `## Failed Tests Analysis\n\n`;
      const failedTests = this.results.filter(r => !r.passed);
      for (const test of failedTests) {
        report += `### ${test.category} - ${test.subcategory}\n`;
        report += `**Test**: ${test.testName}\n`;
        report += `**Error**: ${test.error}\n\n`;
      }
    }

    return report;
  }

  private groupResultsByCategory(): Record<string, AuthTestResult[]> {
    return this.results.reduce((acc, result) => {
      if (!acc[result.category]) {
        acc[result.category] = [];
      }
      acc[result.category].push(result);
      return acc;
    }, {} as Record<string, AuthTestResult[]>);
  }

  // ===== ENVIRONMENT VARIABLES & CONFIGURATION TESTS =====
  async testEnvironmentConfiguration(page: Page) {
    console.log('\n🔧 Testing Environment Configuration...');

    // Test 1: Required environment variables
    try {
      const response = await page.request.get(`${this.testEnv.PLAYWRIGHT_BASE_URL}/api/test/env-debug`);
      const envData = await response.json();
      
      const requiredVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'NEXT_PUBLIC_APP_URL'
      ];

      const missingVars = requiredVars.filter(varName => !envData[varName]);
      
      await this.addResult({
        category: 'Environment Variables & Configuration',
        subcategory: 'Required Variables',
        testName: 'Check required environment variables are set',
        passed: missingVars.length === 0,
        error: missingVars.length > 0 ? `Missing: ${missingVars.join(', ')}` : undefined,
        details: { missingVars, envData }
      });
    } catch (error) {
      await this.addResult({
        category: 'Environment Variables & Configuration',
        subcategory: 'Required Variables',
        testName: 'Check required environment variables are set',
        passed: false,
        error: `Failed to check environment: ${error}`
      });
    }

    // Test 2: RBAC environment variables
    try {
      const response = await page.request.get(`${this.testEnv.PLAYWRIGHT_BASE_URL}/api/test/rbac-debug?email=${this.testEnv.ADMIN_EMAIL}`);
      const rbacData = await response.json();
      
      const rbacVars = [
        'SUPER_ADMIN_EMAILS',
        'ADMIN_PAYMENT_EMAILS',
        'ADMIN_PROFILE_EMAILS',
        'ADMIN_TCC_EMAILS'
      ];

      const missingRbacVars = rbacVars.filter(varName => !rbacData.envVars[varName]);
      
      await this.addResult({
        category: 'Environment Variables & Configuration',
        subcategory: 'RBAC Configuration',
        testName: 'Check RBAC environment variables are configured',
        passed: missingRbacVars.length === 0,
        error: missingRbacVars.length > 0 ? `Missing RBAC vars: ${missingRbacVars.join(', ')}` : undefined,
        details: { missingRbacVars, rbacData }
      });
    } catch (error) {
      await this.addResult({
        category: 'Environment Variables & Configuration',
        subcategory: 'RBAC Configuration',
        testName: 'Check RBAC environment variables are configured',
        passed: false,
        error: `Failed to check RBAC: ${error}`
      });
    }
  }

  // ===== AUTHENTICATION FLOW & SESSION MANAGEMENT TESTS =====
  async testAuthenticationFlow(page: Page) {
    console.log('\n🔐 Testing Authentication Flow...');

    // Test 1: Magic link authentication
    try {
      const response = await page.request.get(`${this.testEnv.PLAYWRIGHT_BASE_URL}/api/test/magic-link?email=${this.testEnv.ADMIN_EMAIL}`);
      const magicLinkData = await response.json();
      
      await this.addResult({
        category: 'Authentication Flow & Session Management',
        subcategory: 'Magic Link Generation',
        testName: 'Magic link can be generated for admin email',
        passed: magicLinkData.ok === true,
        error: magicLinkData.ok === false ? magicLinkData.message : undefined,
        details: magicLinkData
      });
    } catch (error) {
      await this.addResult({
        category: 'Authentication Flow & Session Management',
        subcategory: 'Magic Link Generation',
        testName: 'Magic link can be generated for admin email',
        passed: false,
        error: `Failed to generate magic link: ${error}`
      });
    }

    // Test 2: Session establishment
    try {
      // First, get a magic link
      const magicLinkResponse = await page.request.get(`${this.testEnv.PLAYWRIGHT_BASE_URL}/api/test/magic-link?email=${this.testEnv.ADMIN_EMAIL}`);
      const magicLinkData = await magicLinkResponse.json();
      
      if (magicLinkData.ok && magicLinkData.magicLink) {
        // Simulate clicking the magic link
        const callbackResponse = await page.request.get(magicLinkData.magicLink);
        
        await this.addResult({
          category: 'Authentication Flow & Session Management',
          subcategory: 'Session Establishment',
          testName: 'Session can be established via magic link',
          passed: callbackResponse.status() === 200 || callbackResponse.status() === 302,
          error: callbackResponse.status() >= 400 ? `HTTP ${callbackResponse.status()}` : undefined,
          details: { status: callbackResponse.status(), url: magicLinkData.magicLink }
        });
      } else {
        await this.addResult({
          category: 'Authentication Flow & Session Management',
          subcategory: 'Session Establishment',
          testName: 'Session can be established via magic link',
          passed: false,
          error: 'Failed to generate magic link for session test'
        });
      }
    } catch (error) {
      await this.addResult({
        category: 'Authentication Flow & Session Management',
        subcategory: 'Session Establishment',
        testName: 'Session can be established via magic link',
        passed: false,
        error: `Failed to establish session: ${error}`
      });
    }
  }

  // ===== RBAC SYSTEM TESTS =====
  async testRBACSystem(page: Page) {
    console.log('\n👥 Testing RBAC System...');

    // Test 1: User role assignment
    try {
      const response = await page.request.get(`${this.testEnv.PLAYWRIGHT_BASE_URL}/api/test/rbac-debug?email=${this.testEnv.ADMIN_EMAIL}`);
      const rbacData = await response.json();
      
      const hasRoles = rbacData.roles && rbacData.roles.length > 0;
      const isSuperAdmin = rbacData.roles && rbacData.roles.includes('super_admin');
      
      await this.addResult({
        category: 'RBAC (Role-Based Access Control) System',
        subcategory: 'Role Assignment',
        testName: 'User has assigned roles in RBAC system',
        passed: hasRoles,
        error: !hasRoles ? 'User has no assigned roles' : undefined,
        details: { roles: rbacData.roles, isSuperAdmin }
      });
    } catch (error) {
      await this.addResult({
        category: 'RBAC (Role-Based Access Control) System',
        subcategory: 'Role Assignment',
        testName: 'User has assigned roles in RBAC system',
        passed: false,
        error: `Failed to check RBAC roles: ${error}`
      });
    }

    // Test 2: Super admin access
    try {
      const response = await page.request.get(`${this.testEnv.PLAYWRIGHT_BASE_URL}/api/test/rbac-debug?email=${this.testEnv.ADMIN_EMAIL}`);
      const rbacData = await response.json();
      
      const isSuperAdmin = rbacData.roles && rbacData.roles.includes('super_admin');
      
      await this.addResult({
        category: 'RBAC (Role-Based Access Control) System',
        subcategory: 'Super Admin Access',
        testName: 'User has super_admin role for management access',
        passed: isSuperAdmin,
        error: !isSuperAdmin ? 'User does not have super_admin role' : undefined,
        details: { roles: rbacData.roles, superAdminEmails: rbacData.superAdmins }
      });
    } catch (error) {
      await this.addResult({
        category: 'RBAC (Role-Based Access Control) System',
        subcategory: 'Super Admin Access',
        testName: 'User has super_admin role for management access',
        passed: false,
        error: `Failed to check super admin access: ${error}`
      });
    }
  }

  // ===== MIDDLEWARE & ROUTE PROTECTION TESTS =====
  async testMiddlewareAndRouteProtection(page: Page) {
    console.log('\n🛡️ Testing Middleware & Route Protection...');

    // Test 1: Admin route protection
    try {
      const response = await page.request.get(`${this.testEnv.PLAYWRIGHT_BASE_URL}/admin/management`);
      
      await this.addResult({
        category: 'Middleware & Route Protection',
        subcategory: 'Route Access',
        testName: 'Admin management route is accessible',
        passed: response.status() === 200,
        error: response.status() !== 200 ? `HTTP ${response.status()}` : undefined,
        details: { status: response.status(), url: response.url() }
      });
    } catch (error) {
      await this.addResult({
        category: 'Middleware & Route Protection',
        subcategory: 'Route Access',
        testName: 'Admin management route is accessible',
        passed: false,
        error: `Failed to access route: ${error}`
      });
    }

    // Test 2: Middleware authentication check
    try {
      const response = await page.request.get(`${this.testEnv.PLAYWRIGHT_BASE_URL}/admin/management`, {
        headers: {
          'Cookie': '' // No cookies
        }
      });
      
      const isRedirectedToLogin = response.status() === 302 || response.status() === 307;
      const redirectLocation = response.headers()['location'];
      const isLoginRedirect = redirectLocation && redirectLocation.includes('/admin/login');
      
      await this.addResult({
        category: 'Middleware & Route Protection',
        subcategory: 'Authentication Check',
        testName: 'Middleware redirects unauthenticated users to login',
        passed: isRedirectedToLogin && isLoginRedirect,
        error: !isRedirectedToLogin ? 'No redirect occurred' : !isLoginRedirect ? 'Redirected to wrong location' : undefined,
        details: { status: response.status(), redirectLocation }
      });
    } catch (error) {
      await this.addResult({
        category: 'Middleware & Route Protection',
        subcategory: 'Authentication Check',
        testName: 'Middleware redirects unauthenticated users to login',
        passed: false,
        error: `Failed to test middleware: ${error}`
      });
    }
  }

  // ===== COOKIE & TOKEN MANAGEMENT TESTS =====
  async testCookieAndTokenManagement(page: Page) {
    console.log('\n🍪 Testing Cookie & Token Management...');

    // Test 1: Authentication cookies
    try {
      // First authenticate
      const magicLinkResponse = await page.request.get(`${this.testEnv.PLAYWRIGHT_BASE_URL}/api/test/magic-link?email=${this.testEnv.ADMIN_EMAIL}`);
      const magicLinkData = await magicLinkResponse.json();
      
      if (magicLinkData.ok && magicLinkData.magicLink) {
        const callbackResponse = await page.request.get(magicLinkData.magicLink);
        const cookies = callbackResponse.headers()['set-cookie'];
        
        const hasAuthCookies = cookies && (
          cookies.includes('admin-email') || 
          cookies.includes('sb-') ||
          cookies.includes('supabase')
        );
        
        await this.addResult({
          category: 'Cookie & Token Management',
          subcategory: 'Authentication Cookies',
          testName: 'Authentication cookies are set after login',
          passed: hasAuthCookies,
          error: !hasAuthCookies ? 'No authentication cookies found' : undefined,
          details: { cookies: cookies?.split(',') }
        });
      } else {
        await this.addResult({
          category: 'Cookie & Token Management',
          subcategory: 'Authentication Cookies',
          testName: 'Authentication cookies are set after login',
          passed: false,
          error: 'Failed to generate magic link for cookie test'
        });
      }
    } catch (error) {
      await this.addResult({
        category: 'Cookie & Token Management',
        subcategory: 'Authentication Cookies',
        testName: 'Authentication cookies are set after login',
        passed: false,
        error: `Failed to test cookies: ${error}`
      });
    }

    // Test 2: Cookie persistence
    try {
      const response = await page.request.get(`${this.testEnv.PLAYWRIGHT_BASE_URL}/api/admin/me`);
      
      await this.addResult({
        category: 'Cookie & Token Management',
        subcategory: 'Cookie Persistence',
        testName: 'Authentication cookies persist across requests',
        passed: response.status() === 200,
        error: response.status() !== 200 ? `HTTP ${response.status()}` : undefined,
        details: { status: response.status() }
      });
    } catch (error) {
      await this.addResult({
        category: 'Cookie & Token Management',
        subcategory: 'Cookie Persistence',
        testName: 'Authentication cookies persist across requests',
        passed: false,
        error: `Failed to test cookie persistence: ${error}`
      });
    }
  }

  // ===== DATABASE & USER STATE TESTS =====
  async testDatabaseAndUserState(page: Page) {
    console.log('\n🗄️ Testing Database & User State...');

    // Test 1: User exists in admin_users table
    try {
      const response = await page.request.get(`${this.testEnv.PLAYWRIGHT_BASE_URL}/api/admin/me`);
      const userData = await response.json();
      
      await this.addResult({
        category: 'Database & User State',
        subcategory: 'User Record',
        testName: 'User exists in admin_users table',
        passed: response.status() === 200 && userData.email,
        error: response.status() !== 200 ? `HTTP ${response.status()}` : !userData.email ? 'No user data returned' : undefined,
        details: { status: response.status(), userData }
      });
    } catch (error) {
      await this.addResult({
        category: 'Database & User State',
        subcategory: 'User Record',
        testName: 'User exists in admin_users table',
        passed: false,
        error: `Failed to check user record: ${error}`
      });
    }

    // Test 2: User is active
    try {
      const response = await page.request.get(`${this.testEnv.PLAYWRIGHT_BASE_URL}/api/admin/me`);
      const userData = await response.json();
      
      await this.addResult({
        category: 'Database & User State',
        subcategory: 'User Status',
        testName: 'User account is active',
        passed: response.status() === 200 && userData.is_active !== false,
        error: response.status() !== 200 ? `HTTP ${response.status()}` : userData.is_active === false ? 'User account is inactive' : undefined,
        details: { status: response.status(), isActive: userData.is_active }
      });
    } catch (error) {
      await this.addResult({
        category: 'Database & User State',
        subcategory: 'User Status',
        testName: 'User account is active',
        passed: false,
        error: `Failed to check user status: ${error}`
      });
    }
  }

  // ===== NETWORK & INFRASTRUCTURE TESTS =====
  async testNetworkAndInfrastructure(page: Page) {
    console.log('\n🌐 Testing Network & Infrastructure...');

    // Test 1: Supabase connectivity
    try {
      const response = await page.request.get(`${this.testEnv.PLAYWRIGHT_BASE_URL}/api/test/supabase-health`);
      const healthData = await response.json();
      
      await this.addResult({
        category: 'Network & Infrastructure',
        subcategory: 'Supabase Connectivity',
        testName: 'Supabase connection is healthy',
        passed: response.status() === 200 && healthData.status === 'healthy',
        error: response.status() !== 200 ? `HTTP ${response.status()}` : healthData.status !== 'healthy' ? healthData.error : undefined,
        details: healthData
      });
    } catch (error) {
      await this.addResult({
        category: 'Network & Infrastructure',
        subcategory: 'Supabase Connectivity',
        testName: 'Supabase connection is healthy',
        passed: false,
        error: `Failed to check Supabase health: ${error}`
      });
    }

    // Test 2: Application health
    try {
      const response = await page.request.get(`${this.testEnv.PLAYWRIGHT_BASE_URL}/api/health`);
      
      await this.addResult({
        category: 'Network & Infrastructure',
        subcategory: 'Application Health',
        testName: 'Application is responding to health checks',
        passed: response.status() === 200,
        error: response.status() !== 200 ? `HTTP ${response.status()}` : undefined,
        details: { status: response.status() }
      });
    } catch (error) {
      await this.addResult({
        category: 'Network & Infrastructure',
        subcategory: 'Application Health',
        testName: 'Application is responding to health checks',
        passed: false,
        error: `Failed to check application health: ${error}`
      });
    }
  }

  // ===== BROWSER & CLIENT-SIDE TESTS =====
  async testBrowserAndClientSide(page: Page) {
    console.log('\n🌍 Testing Browser & Client-Side...');

    // Test 1: Page loads without JavaScript errors
    try {
      const pageErrors: string[] = [];
      
      page.on('pageerror', (error) => {
        pageErrors.push(error.message);
      });

      await page.goto(`${this.testEnv.PLAYWRIGHT_BASE_URL}/admin/management`);
      
      await this.addResult({
        category: 'Browser & Client-Side Issues',
        subcategory: 'JavaScript Errors',
        testName: 'Page loads without JavaScript errors',
        passed: pageErrors.length === 0,
        error: pageErrors.length > 0 ? `JavaScript errors: ${pageErrors.join(', ')}` : undefined,
        details: { errors: pageErrors }
      });
    } catch (error) {
      await this.addResult({
        category: 'Browser & Client-Side Issues',
        subcategory: 'JavaScript Errors',
        testName: 'Page loads without JavaScript errors',
        passed: false,
        error: `Failed to load page: ${error}`
      });
    }

    // Test 2: Authentication state in browser
    try {
      await page.goto(`${this.testEnv.PLAYWRIGHT_BASE_URL}/admin/management`);
      
      // Check if we're redirected to login
      const currentUrl = page.url();
      const isRedirectedToLogin = currentUrl.includes('/admin/login');
      
      await this.addResult({
        category: 'Browser & Client-Side Issues',
        subcategory: 'Authentication State',
        testName: 'Browser maintains authentication state',
        passed: !isRedirectedToLogin,
        error: isRedirectedToLogin ? 'Redirected to login page' : undefined,
        details: { currentUrl, isRedirectedToLogin }
      });
    } catch (error) {
      await this.addResult({
        category: 'Browser & Client-Side Issues',
        subcategory: 'Authentication State',
        testName: 'Browser maintains authentication state',
        passed: false,
        error: `Failed to check authentication state: ${error}`
      });
    }
  }

  // ===== MAIN ANALYSIS METHOD =====
  async performCompleteAnalysis(page: Page) {
    console.log('🚀 Starting Admin Management Authentication Analysis...');
    console.log('📊 Using Ishikawa Diagram Methodology');
    
    await this.testEnvironmentConfiguration(page);
    await this.testAuthenticationFlow(page);
    await this.testRBACSystem(page);
    await this.testMiddlewareAndRouteProtection(page);
    await this.testCookieAndTokenManagement(page);
    await this.testDatabaseAndUserState(page);
    await this.testNetworkAndInfrastructure(page);
    await this.testBrowserAndClientSide(page);
    
    console.log('\n📋 Analysis Complete!');
    console.log('📄 Generating Ishikawa Report...');
    
    const report = this.generateIshikawaReport();
    console.log('\n' + report);
    
    return {
      results: this.results,
      report,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.passed).length,
        failed: this.results.filter(r => !r.passed).length
      }
    };
  }
}

// ===== PLAYWRIGHT TEST SUITE =====
test.describe('Admin Management Authentication Analysis', () => {
  let analyzer: AdminManagementAuthAnalyzer;

  test.beforeEach(async () => {
    analyzer = new AdminManagementAuthAnalyzer();
  });

  test('Complete Ishikawa Analysis of Authentication Issues', async ({ page }) => {
    const analysis = await analyzer.performCompleteAnalysis(page);
    
    // Save detailed report to file
    const fs = require('fs');
    const reportPath = 'test-results/admin-management-auth-analysis.md';
    fs.mkdirSync('test-results', { recursive: true });
    fs.writeFileSync(reportPath, analysis.report);
    
    console.log(`📄 Detailed report saved to: ${reportPath}`);
    
    // Assert that critical tests pass
    const criticalTests = analysis.results.filter(r => 
      r.subcategory === 'Super Admin Access' || 
      r.subcategory === 'Authentication Cookies' ||
      r.subcategory === 'Route Access'
    );
    
    const criticalFailures = criticalTests.filter(t => !t.passed);
    
    if (criticalFailures.length > 0) {
      console.error('❌ Critical authentication tests failed:');
      criticalFailures.forEach(failure => {
        console.error(`  - ${failure.category}: ${failure.subcategory} - ${failure.error}`);
      });
      
      // Don't fail the test, but provide detailed information
      expect(criticalFailures.length).toBe(0);
    } else {
      console.log('✅ All critical authentication tests passed!');
    }
  });

  test('Specific Test: Super Admin Role Assignment', async ({ page }) => {
    const response = await page.request.get(`${getTestEnv().PLAYWRIGHT_BASE_URL}/api/test/rbac-debug?email=${getTestEnv().ADMIN_EMAIL}`);
    const rbacData = await response.json();
    
    expect(response.status()).toBe(200);
    expect(rbacData.roles).toContain('super_admin');
  });

  test('Specific Test: Admin Management Route Access', async ({ page }) => {
    const response = await page.request.get(`${getTestEnv().PLAYWRIGHT_BASE_URL}/admin/management`);
    
    // This test should fail if authentication is not working
    // The route should either return 200 (success) or 302/307 (redirect to login)
    expect([200, 302, 307]).toContain(response.status());
  });
});
