import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Magic Link Analyzer
 * 
 * Comprehensive analysis tool for magic link authentication issues.
 * Provides deep analysis of URLs, tokens, sessions, and error conditions.
 */

export class MagicLinkAnalyzer {
  private page: Page;
  private analysisData: any = {};
  private reportsDir: string;

  constructor(page: Page) {
    this.page = page;
    this.reportsDir = path.join(process.cwd(), 'test-artifacts', 'magic-link-analysis');
    this.ensureReportsDirectory();
  }

  private ensureReportsDirectory() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Validate environment configuration
   */
  async validateEnvironment() {
    console.log('[Analyzer] 🔍 Validating environment configuration');
    
    const validation = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
      config: {
        nodeEnv: process.env.NODE_ENV,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        adminEmails: process.env.ADMIN_EMAILS,
        emailMode: process.env.EMAIL_MODE,
        cronSecret: process.env.CRON_SECRET
      }
    };

    // Check required environment variables
    const required = [
      'NEXT_PUBLIC_APP_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    for (const envVar of required) {
      if (!process.env[envVar]) {
        validation.valid = false;
        validation.errors.push(`Missing required environment variable: ${envVar}`);
      }
    }

    // Validate URL formats
    if (process.env.NEXT_PUBLIC_APP_URL) {
      try {
        new URL(process.env.NEXT_PUBLIC_APP_URL);
      } catch {
        validation.valid = false;
        validation.errors.push('Invalid NEXT_PUBLIC_APP_URL format');
      }
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
      } catch {
        validation.valid = false;
        validation.errors.push('Invalid NEXT_PUBLIC_SUPABASE_URL format');
      }
    }

    // Check for common configuration issues
    if (process.env.NEXT_PUBLIC_APP_URL?.includes('localhost') && process.env.NODE_ENV === 'production') {
      validation.warnings.push('Using localhost URL in production environment');
    }

    if (!process.env.ADMIN_EMAILS) {
      validation.warnings.push('ADMIN_EMAILS not configured - admin access may be restricted');
    }

    console.log('[Analyzer] Environment validation result:', validation);
    return validation;
  }

  /**
   * Validate admin login page
   */
  async validateLoginPage() {
    console.log('[Analyzer] 🔐 Validating admin login page');
    
    const validation = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
      elements: {
        emailInput: false,
        magicLinkButton: false,
        successMessage: false,
        errorMessage: false
      }
    };

    try {
      // Check if we're on the login page
      await this.page.waitForSelector('text=Admin Login', { timeout: 10000 });
      
      // Check for email input
      const emailInput = await this.page.locator('input[type="email"]').isVisible();
      validation.elements.emailInput = emailInput;
      
      if (!emailInput) {
        validation.valid = false;
        validation.errors.push('Email input field not found');
      }

      // Check for magic link button
      const magicLinkButton = await this.page.locator('button:has-text("Send Magic Link")').isVisible();
      validation.elements.magicLinkButton = magicLinkButton;
      
      if (!magicLinkButton) {
        validation.valid = false;
        validation.errors.push('Send Magic Link button not found');
      }

      // Check for authentication status
      const notAuthenticated = await this.page.locator('text=Not Authenticated').isVisible();
      if (!notAuthenticated) {
        validation.warnings.push('Authentication status indicator not found');
      }

    } catch (error) {
      validation.valid = false;
      validation.errors.push(`Login page validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('[Analyzer] Login page validation result:', validation);
    return validation;
  }

  /**
   * Generate magic link via API
   */
  async generateMagicLinkViaAPI(email: string) {
    console.log('[Analyzer] 📧 Generating magic link via API for:', email);
    
    try {
      const response = await this.page.request.get(`http://localhost:8080/api/test/magic-link?email=${email}`);
      const data = await response.json();
      
      const result = {
        success: response.ok() && data.ok,
        actionLink: data.actionLink || data.loginUrl,
        error: data.error || data.message,
        response: data,
        status: response.status()
      };

      if (result.success && result.actionLink) {
        console.log('[Analyzer] ✅ Magic link generated successfully');
        console.log('[Analyzer] Action link preview:', result.actionLink.substring(0, 100) + '...');
      } else {
        console.error('[Analyzer] ❌ Magic link generation failed:', result.error);
      }

      return result;
    } catch (error) {
      console.error('[Analyzer] ❌ Magic link generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        actionLink: null,
        response: null,
        status: 0
      };
    }
  }

  /**
   * Analyze magic link URL structure
   */
  async analyzeMagicLinkUrl(url: string) {
    console.log('[Analyzer] 🔗 Analyzing magic link URL structure');
    
    const analysis = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
      url: url,
      parsed: null as any,
      issues: [] as string[]
    };

    try {
      const parsedUrl = new URL(url);
      analysis.parsed = {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        pathname: parsedUrl.pathname,
        search: parsedUrl.search,
        hash: parsedUrl.hash,
        origin: parsedUrl.origin
      };

      // Check for malformed hostname
      if (parsedUrl.hostname.includes('%2A') || parsedUrl.hostname.includes('*')) {
        analysis.valid = false;
        analysis.errors.push('Malformed hostname detected (contains %2A or *)');
        analysis.issues.push('DNS_RESOLUTION_FAILURE');
      }

      // Check for localhost in production-like URLs
      if (parsedUrl.hostname.includes('localhost') && url.includes('vercel.app')) {
        analysis.warnings.push('Localhost detected in Vercel URL');
      }

      // Check for proper callback path
      if (!parsedUrl.pathname.includes('/auth/callback')) {
        analysis.warnings.push('Callback path may be incorrect');
      }

      // Check for token parameters
      if (parsedUrl.hash) {
        const hashParams = new URLSearchParams(parsedUrl.hash.substring(1));
        const hasAccessToken = hashParams.has('access_token');
        const hasRefreshToken = hashParams.has('refresh_token');
        
        if (!hasAccessToken || !hasRefreshToken) {
          analysis.warnings.push('Missing required token parameters in URL hash');
        }
      }

    } catch (error) {
      analysis.valid = false;
      analysis.errors.push(`URL parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('[Analyzer] URL analysis result:', analysis);
    return analysis;
  }

  /**
   * Click magic link and capture behavior
   */
  async clickMagicLink(url: string) {
    console.log('[Analyzer] 🖱️ Clicking magic link and capturing behavior');
    
    const result = {
      success: false,
      initialUrl: url,
      finalUrl: '',
      redirects: [] as string[],
      errors: [] as string[],
      warnings: [] as string[],
      timeToLoad: 0,
      networkErrors: [] as any[]
    };

    try {
      const startTime = Date.now();
      
      // Navigate to the magic link
      await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      result.timeToLoad = Date.now() - startTime;
      result.finalUrl = this.page.url();

      // Capture any network errors
      this.page.on('requestfailed', (request) => {
        result.networkErrors.push({
          url: request.url(),
          method: request.method(),
          failure: request.failure()?.errorText
        });
      });

      // Check for redirects
      if (result.finalUrl !== url) {
        result.redirects.push(result.finalUrl);
      }

      // Check for error conditions
      if (result.finalUrl.includes('%2A.vercel.app')) {
        result.errors.push('Redirected to malformed URL with %2A');
      }

      if (result.finalUrl.includes('error=')) {
        result.errors.push('Error parameters detected in final URL');
      }

      // Check if we're on the callback page
      const isOnCallbackPage = await this.page.locator('text=Processing Authentication').isVisible();
      if (isOnCallbackPage) {
        result.success = true;
        console.log('[Analyzer] ✅ Successfully reached callback page');
      } else {
        result.warnings.push('Not on expected callback page');
      }

    } catch (error) {
      result.errors.push(`Navigation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('[Analyzer] Magic link click result:', result);
    return result;
  }

  /**
   * Analyze redirects during authentication flow
   */
  async analyzeRedirects() {
    console.log('[Analyzer] 🔄 Analyzing redirects during authentication flow');
    
    const redirects = await this.page.evaluate(() => {
      return (window as any).__REDIRECT_HISTORY || [];
    });

    const analysis = {
      count: redirects.length,
      redirects: redirects,
      issues: [] as string[],
      finalDestination: this.page.url()
    };

    // Analyze redirect patterns
    for (const redirect of redirects) {
      if (redirect.includes('%2A.vercel.app')) {
        analysis.issues.push('Malformed redirect detected');
      }
      
      if (redirect.includes('error=')) {
        analysis.issues.push('Error redirect detected');
      }
    }

    console.log('[Analyzer] Redirect analysis result:', analysis);
    return analysis;
  }

  /**
   * Analyze final state after authentication attempt
   */
  async analyzeFinalState() {
    console.log('[Analyzer] 🎯 Analyzing final state after authentication attempt');
    
    const analysis = {
      url: this.page.url(),
      isAuthenticated: false,
      isOnAdminPage: false,
      isOnCallbackPage: false,
      isOnErrorPage: false,
      hasError: false,
      errorMessage: '',
      pageTitle: '',
      elements: {
        adminDashboard: false,
        processingMessage: false,
        errorMessage: false,
        successMessage: false
      }
    };

    try {
      // Get page title
      analysis.pageTitle = await this.page.title();

      // Check current page state
      analysis.isOnAdminPage = await this.page.locator('text=Admin Dashboard').isVisible();
      analysis.isOnCallbackPage = await this.page.locator('text=Processing Authentication').isVisible();
      analysis.isOnErrorPage = await this.page.locator('text=Authentication Failed').isVisible();

      // Check for error conditions
      if (analysis.url.includes('error=')) {
        analysis.hasError = true;
        const urlParams = new URLSearchParams(analysis.url.split('#')[1] || '');
        analysis.errorMessage = urlParams.get('error_description') || 'Unknown error';
      }

      // Check for authentication success
      analysis.isAuthenticated = analysis.isOnAdminPage && !analysis.hasError;

      // Check for specific elements
      analysis.elements.adminDashboard = await this.page.locator('text=Admin Dashboard').isVisible();
      analysis.elements.processingMessage = await this.page.locator('text=Processing Authentication').isVisible();
      analysis.elements.errorMessage = await this.page.locator('text=Authentication Failed').isVisible();
      analysis.elements.successMessage = await this.page.locator('text=Authentication Successful').isVisible();

    } catch (error) {
      analysis.hasError = true;
      analysis.errorMessage = `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    console.log('[Analyzer] Final state analysis result:', analysis);
    return analysis;
  }

  /**
   * Verify session establishment
   */
  async verifySession() {
    console.log('[Analyzer] 🔑 Verifying session establishment');
    
    const verification = {
      hasValidSession: false,
      cookies: [] as any[],
      localStorage: {} as any,
      sessionStorage: {} as any,
      supabaseSession: null as any,
      issues: [] as string[]
    };

    try {
      // Check cookies
      const cookies = await this.page.context().cookies();
      verification.cookies = cookies;

      const supabaseCookies = cookies.filter(cookie => cookie.name.startsWith('sb-'));
      if (supabaseCookies.length === 0) {
        verification.issues.push('No Supabase cookies found');
      }

      // Check localStorage
      verification.localStorage = await this.page.evaluate(() => {
        const storage: any = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            storage[key] = localStorage.getItem(key);
          }
        }
        return storage;
      });

      // Check sessionStorage
      verification.sessionStorage = await this.page.evaluate(() => {
        const storage: any = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) {
            storage[key] = sessionStorage.getItem(key);
          }
        }
        return storage;
      });

      // Check for Supabase session
      const supabaseSession = await this.page.evaluate(() => {
        return (window as any).supabase?.auth?.session() || null;
      });
      verification.supabaseSession = supabaseSession;

      // Determine if session is valid
      verification.hasValidSession = supabaseCookies.length > 0 && 
                                    (supabaseSession || Object.keys(verification.localStorage).some(key => key.includes('supabase')));

    } catch (error) {
      verification.issues.push(`Session verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('[Analyzer] Session verification result:', verification);
    return verification;
  }

  /**
   * Test rate limiting scenarios
   */
  async testRateLimiting() {
    console.log('[Analyzer] ⏱️ Testing rate limiting scenarios');
    
    const results = {
      rateLimited: false,
      cooldownPeriod: 0,
      attempts: [] as any[],
      recommendations: [] as string[]
    };

    try {
      // Make multiple rapid requests
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        const response = await this.page.request.get('http://localhost:8080/api/test/magic-link?email=test@example.com');
        const endTime = Date.now();
        
        results.attempts.push({
          attempt: i + 1,
          status: response.status(),
          responseTime: endTime - startTime,
          success: response.ok()
        });

        if (response.status() === 429) {
          results.rateLimited = true;
          results.recommendations.push('Rate limiting detected - implement exponential backoff');
        }

        // Small delay between requests
        await this.page.waitForTimeout(1000);
      }

    } catch (error) {
      results.recommendations.push(`Rate limiting test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('[Analyzer] Rate limiting test result:', results);
    return results;
  }

  /**
   * Test token expiration scenarios
   */
  async testTokenExpiration() {
    console.log('[Analyzer] ⏰ Testing token expiration scenarios');
    
    const results = {
      tokenExpiryTime: 0,
      isExpired: false,
      recommendations: [] as string[]
    };

    try {
      // Generate a magic link
      const magicLinkResponse = await this.page.request.get('http://localhost:8080/api/test/magic-link?email=test@example.com');
      const magicLinkData = await magicLinkResponse.json();
      
      if (magicLinkData.actionLink) {
        // Extract token from URL
        const url = new URL(magicLinkData.actionLink);
        const hashParams = new URLSearchParams(url.hash.substring(1));
        const expiresAt = hashParams.get('expires_at');
        
        if (expiresAt) {
          const expiryTime = parseInt(expiresAt) * 1000; // Convert to milliseconds
          const currentTime = Date.now();
          results.tokenExpiryTime = expiryTime - currentTime;
          results.isExpired = currentTime > expiryTime;
          
          if (results.tokenExpiryTime < 60000) { // Less than 1 minute
            results.recommendations.push('Token expiry time is very short - consider increasing');
          }
        }
      }

    } catch (error) {
      results.recommendations.push(`Token expiration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('[Analyzer] Token expiration test result:', results);
    return results;
  }

  /**
   * Test DNS resolution
   */
  async testDNSResolution() {
    console.log('[Analyzer] 🌐 Testing DNS resolution');
    
    const results = {
      localhostResolves: false,
      vercelAppResolves: false,
      malformedUrlResolves: false,
      issues: [] as string[]
    };

    try {
      // Test localhost resolution
      try {
        await this.page.goto('http://localhost:8080', { timeout: 5000 });
        results.localhostResolves = true;
      } catch {
        results.issues.push('Localhost does not resolve');
      }

      // Test Vercel app resolution (simulated)
      try {
        const response = await this.page.request.get('https://vercel.app', { timeout: 5000 });
        results.vercelAppResolves = response.ok();
      } catch {
        results.issues.push('Vercel.app does not resolve');
      }

      // Test malformed URL resolution
      try {
        await this.page.goto('https://%2A.vercel.app', { timeout: 5000 });
        results.malformedUrlResolves = true;
      } catch {
        // This is expected to fail
        results.issues.push('Malformed URL (%2A.vercel.app) correctly fails to resolve');
      }

    } catch (error) {
      results.issues.push(`DNS resolution test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('[Analyzer] DNS resolution test result:', results);
    return results;
  }

  /**
   * Test malformed URL handling
   */
  async testMalformedUrlHandling() {
    console.log('[Analyzer] 🔗 Testing malformed URL handling');
    
    const results = {
      malformedUrls: [
        'https://%2A.vercel.app/auth/callback',
        'https://*.vercel.app/auth/callback',
        'http://localhost:8080/auth/callback#error=access_denied',
        'http://localhost:8080/auth/callback#error_code=otp_expired'
      ],
      handlingResults: [] as any[]
    };

    for (const url of results.malformedUrls) {
      try {
        const response = await this.page.request.get(url, { timeout: 10000 });
        results.handlingResults.push({
          url,
          status: response.status(),
          success: response.ok(),
          error: null
        });
      } catch (error) {
        results.handlingResults.push({
          url,
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log('[Analyzer] Malformed URL handling test result:', results);
    return results;
  }

  /**
   * Test staging environment configuration
   */
  async testStagingEnvironment() {
    console.log('[Analyzer] 🏗️ Testing staging environment configuration');
    
    const results = {
      valid: true,
      issues: [] as string[],
      config: {
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        nodeEnv: process.env.NODE_ENV,
        supabaseEnv: process.env.SUPABASE_ENV
      }
    };

    // Validate staging-specific configuration
    if (process.env.NODE_ENV !== 'development' && process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')) {
      results.valid = false;
      results.issues.push('Localhost URL detected in non-development environment');
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co')) {
      results.valid = false;
      results.issues.push('Invalid Supabase URL for staging environment');
    }

    console.log('[Analyzer] Staging environment test result:', results);
    return results;
  }

  /**
   * Test production environment simulation
   */
  async testProductionEnvironment() {
    console.log('[Analyzer] 🚀 Testing production environment simulation');
    
    const results = {
      valid: true,
      issues: [] as string[],
      config: {
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        nodeEnv: process.env.NODE_ENV
      }
    };

    // Simulate production environment checks
    if (process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')) {
      results.issues.push('Localhost URL would be invalid in production');
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co')) {
      results.issues.push('Invalid Supabase URL for production environment');
    }

    console.log('[Analyzer] Production environment test result:', results);
    return results;
  }

  /**
   * Test different user agents
   */
  async testUserAgents() {
    console.log('[Analyzer] 🌐 Testing different user agents');
    
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    ];

    const results = {
      userAgents: userAgents,
      testResults: [] as any[]
    };

    for (const userAgent of userAgents) {
      try {
        await this.page.setExtraHTTPHeaders({ 'User-Agent': userAgent });
        const response = await this.page.request.get('http://localhost:8080/admin/login');
        
        results.testResults.push({
          userAgent: userAgent.substring(0, 50) + '...',
          status: response.status(),
          success: response.ok()
        });
      } catch (error) {
        results.testResults.push({
          userAgent: userAgent.substring(0, 50) + '...',
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log('[Analyzer] User agent test result:', results);
    return results;
  }

  /**
   * Test mobile viewport
   */
  async testMobileViewport() {
    console.log('[Analyzer] 📱 Testing mobile viewport');
    
    const results = {
      valid: true,
      issues: [] as string[],
      viewportTests: [] as any[]
    };

    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 414, height: 896, name: 'iPhone 11' },
      { width: 768, height: 1024, name: 'iPad' }
    ];

    for (const viewport of viewports) {
      try {
        await this.page.setViewportSize(viewport);
        await this.page.goto('http://localhost:8080/admin/login');
        
        const elementsVisible = {
          emailInput: await this.page.locator('input[type="email"]').isVisible(),
          magicLinkButton: await this.page.locator('button:has-text("Send Magic Link")').isVisible(),
          title: await this.page.locator('text=Admin Login').isVisible()
        };

        results.viewportTests.push({
          viewport: viewport.name,
          size: `${viewport.width}x${viewport.height}`,
          elementsVisible,
          success: Object.values(elementsVisible).every(v => v)
        });

        if (!Object.values(elementsVisible).every(v => v)) {
          results.issues.push(`Elements not visible on ${viewport.name}`);
        }

      } catch (error) {
        results.viewportTests.push({
          viewport: viewport.name,
          size: `${viewport.width}x${viewport.height}`,
          elementsVisible: {},
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log('[Analyzer] Mobile viewport test result:', results);
    return results;
  }

  /**
   * Generate comprehensive analysis report
   */
  async generateAnalysisReport(testResults: any) {
    console.log('[Analyzer] 📊 Generating comprehensive analysis report');
    
    const report = {
      timestamp: new Date().toISOString(),
      testResults,
      summary: {
        success: testResults.success,
        totalErrors: testResults.errors.length,
        totalWarnings: testResults.warnings.length,
        criticalIssues: testResults.errors.filter((e: any) => 
          e.type === 'Environment Validation' || 
          e.type === 'Magic Link Generation' ||
          e.message?.includes('%2A.vercel.app')
        ).length
      },
      recommendations: this.generateRecommendations(testResults)
    };

    const reportPath = path.join(this.reportsDir, `magic-link-analysis-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('[Analyzer] 📄 Analysis report saved to:', reportPath);
    return report;
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(testResults: any): string[] {
    const recommendations: string[] = [];

    // Check for malformed URL issues
    if (testResults.finalUrl.includes('%2A.vercel.app')) {
      recommendations.push('URGENT: Fix Supabase project configuration - Site URL contains wildcard that is not resolving correctly');
      recommendations.push('Update Supabase project Site URL from "https://*.vercel.app/auth" to specific domain');
    }

    // Check for token expiration
    if (testResults.errors.some((e: any) => e.message?.includes('otp_expired'))) {
      recommendations.push('Increase magic link token expiration time in Supabase project settings');
    }

    // Check for rate limiting
    if (testResults.errors.some((e: any) => e.message?.includes('rate limit'))) {
      recommendations.push('Implement exponential backoff for magic link requests');
      recommendations.push('Consider increasing rate limit thresholds for admin users');
    }

    // Check for session establishment issues
    if (!testResults.sessionState?.hasValidSession) {
      recommendations.push('Review session establishment flow in callback handler');
      recommendations.push('Verify cookie configuration for authentication tokens');
    }

    // Check for environment configuration
    if (testResults.errors.some((e: any) => e.type === 'Environment Validation')) {
      recommendations.push('Review and fix environment variable configuration');
      recommendations.push('Ensure all required environment variables are set correctly');
    }

    return recommendations;
  }

  /**
   * Generate rate limit report
   */
  async generateRateLimitReport(data: any) {
    const reportPath = path.join(this.reportsDir, `rate-limit-analysis-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(data, null, 2));
    console.log('[Analyzer] 📄 Rate limit report saved to:', reportPath);
  }

  /**
   * Generate DNS report
   */
  async generateDNSReport(data: any) {
    const reportPath = path.join(this.reportsDir, `dns-analysis-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(data, null, 2));
    console.log('[Analyzer] 📄 DNS report saved to:', reportPath);
  }

  /**
   * Generate environment report
   */
  async generateEnvironmentReport(data: any) {
    const reportPath = path.join(this.reportsDir, `environment-analysis-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(data, null, 2));
    console.log('[Analyzer] 📄 Environment report saved to:', reportPath);
  }

  /**
   * Generate compatibility report
   */
  async generateCompatibilityReport(data: any) {
    const reportPath = path.join(this.reportsDir, `compatibility-analysis-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(data, null, 2));
    console.log('[Analyzer] 📄 Compatibility report saved to:', reportPath);
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('[Analyzer] 🧹 Cleaning up analyzer resources');
    // Cleanup any temporary resources
  }
}
