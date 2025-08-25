import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Magic Link Debugger
 * 
 * Comprehensive debugging tool for magic link authentication issues.
 * Provides deep analysis of URLs, tokens, sessions, and error conditions.
 */

export class MagicLinkDebugger {
  private page: Page;
  private reportsDir: string;
  private networkRequests: Array<{
    url: string;
    method: string;
    status: number;
    timestamp: string;
    headers: Record<string, string>;
    body?: any;
  }> = [];
  private redirects: Array<{
    from: string;
    to: string;
    timestamp: string;
    status: number;
  }> = [];

  constructor(page: Page) {
    this.page = page;
    this.reportsDir = path.join(process.cwd(), 'test-artifacts', 'magic-link-debug');
    this.ensureReportsDirectory();
    this.setupNetworkMonitoring();
  }

  private ensureReportsDirectory() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  private setupNetworkMonitoring() {
    // Monitor all network requests
    this.page.on('request', request => {
      this.networkRequests.push({
        url: request.url(),
        method: request.method(),
        status: 0, // Will be updated when response is received
        timestamp: new Date().toISOString(),
        headers: request.headers(),
        body: request.postData()
      });
    });

    this.page.on('response', response => {
      const request = this.networkRequests.find(req => req.url === response.url());
      if (request) {
        request.status = response.status();
      }

      // Track redirects
      if (response.status() >= 300 && response.status() < 400) {
        const location = response.headers()['location'];
        if (location) {
          this.redirects.push({
            from: response.url(),
            to: location,
            timestamp: new Date().toISOString(),
            status: response.status()
          });
        }
      }
    });
  }

  /**
   * Perform health check on the application
   */
  async performHealthCheck() {
    console.log('[Debugger] 🏥 Performing health check');
    
    try {
      const response = await this.page.request.get('http://localhost:8080/api/health');
      const healthData = await response.json();
      
      const healthCheck = {
        healthy: response.status() === 200,
        status: response.status(),
        data: healthData,
        issues: [] as string[]
      };

      if (response.status() !== 200) {
        healthCheck.issues.push(`Health endpoint returned status ${response.status()}`);
      }

      if (healthData.status !== 'healthy') {
        healthCheck.issues.push(`Health status is ${healthData.status}, expected 'healthy'`);
      }

      if (healthData.database?.routing !== 'valid') {
        healthCheck.issues.push(`Database routing is ${healthData.database?.routing}, expected 'valid'`);
      }

      console.log('[Debugger] Health check result:', healthCheck);
      return healthCheck;
    } catch (error) {
      console.error('[Debugger] Health check failed:', error);
      return {
        healthy: false,
        status: 0,
        data: null,
        issues: [`Health check failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * Navigate to admin login page
   */
  async navigateToLoginPage() {
    console.log('[Debugger] 🔐 Navigating to admin login page');
    
    try {
      await this.page.goto('http://localhost:8080/admin/login');
      
      // Wait for page to load
      await this.page.waitForLoadState('networkidle');
      
      // Check if login form is present
      const loginForm = await this.page.locator('form').first();
      const emailInput = await this.page.locator('input[type="email"]').first();
      const submitButton = await this.page.locator('button[type="submit"]').first();
      
      const result = {
        success: true,
        url: this.page.url(),
        title: await this.page.title(),
        hasLoginForm: await loginForm.isVisible(),
        hasEmailInput: await emailInput.isVisible(),
        hasSubmitButton: await submitButton.isVisible(),
        error: null as string | null
      };

      if (!result.hasLoginForm || !result.hasEmailInput || !result.hasSubmitButton) {
        result.success = false;
        result.error = 'Login form elements not found';
      }

      console.log('[Debugger] Login page navigation result:', result);
      return result;
    } catch (error) {
      console.error('[Debugger] Login page navigation failed:', error);
      return {
        success: false,
        url: this.page.url(),
        title: await this.page.title(),
        hasLoginForm: false,
        hasEmailInput: false,
        hasSubmitButton: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Generate magic link via API
   */
  async generateMagicLinkViaAPI(email: string) {
    console.log('[Debugger] 📧 Generating magic link via API for:', email);
    
    try {
      const response = await this.page.request.get(
        `http://localhost:8080/api/test/magic-link?email=${encodeURIComponent(email)}`
      );
      
      const data = await response.json();
      
      const result = {
        success: response.status() === 200 && data.ok,
        status: response.status(),
        data: data,
        loginUrl: data.actionLink || null,
        error: data.ok ? null : data.message || 'Unknown error'
      };

      console.log('[Debugger] Magic link generation result:', {
        success: result.success,
        status: result.status,
        hasLoginUrl: !!result.loginUrl,
        error: result.error
      });

      return result;
    } catch (error) {
      console.error('[Debugger] Magic link generation failed:', error);
      return {
        success: false,
        status: 0,
        data: null,
        loginUrl: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Analyze magic link URL for issues
   */
  async analyzeMagicLinkUrl(loginUrl: string) {
    console.log('[Debugger] 🔍 Analyzing magic link URL:', loginUrl);
    
    const analysis = {
      url: loginUrl,
      issues: [] as string[],
      warnings: [] as string[],
      parsed: null as any
    };

    try {
      const url = new URL(loginUrl);
      analysis.parsed = {
        protocol: url.protocol,
        hostname: url.hostname,
        pathname: url.pathname,
        search: url.search,
        hash: url.hash
      };

      // Check for common issues
      if (url.hostname.includes('%2A') || url.hostname.includes('*')) {
        analysis.issues.push(`URL contains wildcard domain: ${url.hostname}`);
      }

      if (url.hostname.includes('vercel.app') && !url.hostname.includes('localhost')) {
        analysis.warnings.push(`URL points to Vercel domain: ${url.hostname}`);
      }

      if (!url.searchParams.has('token') && !url.hash.includes('access_token')) {
        analysis.issues.push('URL does not contain authentication tokens');
      }

      if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
        analysis.warnings.push(`URL uses non-HTTPS protocol: ${url.protocol}`);
      }

      console.log('[Debugger] URL analysis result:', analysis);
      return analysis;
    } catch (error) {
      console.error('[Debugger] URL analysis failed:', error);
      analysis.issues.push(`Failed to parse URL: ${error instanceof Error ? error.message : String(error)}`);
      return analysis;
    }
  }

  /**
   * Simulate magic link click and track the flow
   */
  async simulateMagicLinkClick(loginUrl: string) {
    console.log('[Debugger] 🖱️ Simulating magic link click');
    
    try {
      // Navigate to the magic link
      await this.page.goto(loginUrl);
      
      // Wait for any redirects
      await this.page.waitForLoadState('networkidle', { timeout: 30000 });
      
      const result = {
        success: true,
        initialUrl: loginUrl,
        finalUrl: this.page.url(),
        title: await this.page.title(),
        redirects: this.redirects.filter(r => r.from.includes('magic-link') || r.to.includes('callback')),
        error: null as string | null
      };

      // Check if we ended up on the callback page
      if (this.page.url().includes('/auth/callback')) {
        console.log('[Debugger] ✅ Successfully redirected to callback page');
      } else if (this.page.url().includes('/admin')) {
        console.log('[Debugger] ✅ Successfully authenticated and redirected to admin');
      } else {
        console.log('[Debugger] ⚠️ Unexpected final URL:', this.page.url());
        result.warning = `Unexpected final URL: ${this.page.url()}`;
      }

      console.log('[Debugger] Magic link click result:', result);
      return result;
    } catch (error) {
      console.error('[Debugger] Magic link click failed:', error);
      return {
        success: false,
        initialUrl: loginUrl,
        finalUrl: this.page.url(),
        title: await this.page.title(),
        redirects: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Analyze the complete authentication flow
   */
  async analyzeAuthenticationFlow() {
    console.log('[Debugger] 🔄 Analyzing authentication flow');
    
    try {
      // Check current session state
      const sessionState = await this.page.evaluate(() => {
        return {
          url: window.location.href,
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
          cookies: document.cookie,
          localStorage: Object.keys(localStorage),
          sessionStorage: Object.keys(sessionStorage)
        };
      });

      // Check if we're authenticated
      const whoamiResponse = await this.page.request.get('http://localhost:8080/api/whoami');
      const whoamiData = await whoamiResponse.json();

      const analysis = {
        success: whoamiData.isAuthenticated === true,
        sessionState: sessionState,
        whoamiData: whoamiData,
        finalUrl: this.page.url(),
        issues: [] as string[]
      };

      if (!whoamiData.isAuthenticated) {
        analysis.issues.push('User is not authenticated according to whoami endpoint');
      }

      if (this.page.url().includes('%2A') || this.page.url().includes('*.vercel.app')) {
        analysis.issues.push(`Final URL contains problematic domain: ${this.page.url()}`);
      }

      if (!this.page.url().includes('/admin') && whoamiData.isAuthenticated) {
        analysis.issues.push('User is authenticated but not on admin page');
      }

      console.log('[Debugger] Authentication flow analysis:', analysis);
      return analysis;
    } catch (error) {
      console.error('[Debugger] Authentication flow analysis failed:', error);
      return {
        success: false,
        sessionState: null,
        whoamiData: null,
        finalUrl: this.page.url(),
        issues: [`Analysis failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * Analyze network requests
   */
  async analyzeNetworkRequests() {
    console.log('[Debugger] 🌐 Analyzing network requests');
    
    const analysis = {
      requests: this.networkRequests,
      redirects: this.redirects,
      authRequests: this.networkRequests.filter(r => 
        r.url.includes('/auth') || r.url.includes('/api/auth') || r.url.includes('/callback')
      ),
      failedRequests: this.networkRequests.filter(r => r.status >= 400),
      summary: {
        total: this.networkRequests.length,
        auth: this.networkRequests.filter(r => r.url.includes('/auth')).length,
        failed: this.networkRequests.filter(r => r.status >= 400).length,
        redirects: this.redirects.length
      }
    };

    console.log('[Debugger] Network analysis summary:', analysis.summary);
    return analysis;
  }

  /**
   * Test environment-specific behavior
   */
  async testEnvironment(environment: 'staging' | 'production') {
    console.log(`[Debugger] 🔄 Testing ${environment} environment`);
    
    // This would test environment-specific configurations
    // For now, return mock data
    return {
      environment,
      timestamp: new Date().toISOString(),
      config: {
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        nodeEnv: process.env.NODE_ENV
      },
      issues: []
    };
  }

  /**
   * Compare environments
   */
  async compareEnvironments(staging: any, production: any) {
    console.log('[Debugger] 🔍 Comparing environments');
    
    const differences = {
      config: {
        appUrl: staging.config.appUrl !== production.config.appUrl,
        supabaseUrl: staging.config.supabaseUrl !== production.config.supabaseUrl,
        nodeEnv: staging.config.nodeEnv !== production.config.nodeEnv
      },
      issues: {
        staging: staging.issues,
        production: production.issues
      }
    };

    console.log('[Debugger] Environment differences:', differences);
    return differences;
  }

  /**
   * Generate analysis and recommendations
   */
  async generateAnalysis(testResults: any) {
    console.log('[Debugger] 📊 Generating analysis and recommendations');
    
    const analysis = {
      environmentIssues: [] as string[],
      configurationProblems: [] as string[],
      authenticationFlow: [] as string[],
      recommendations: [] as string[]
    };

    // Analyze environment issues
    if (testResults.appUrl.includes('localhost') && testResults.environment === 'production') {
      analysis.environmentIssues.push('Using localhost URL in production environment');
    }

    if (!testResults.supabaseUrl.includes('supabase.co')) {
      analysis.environmentIssues.push('Invalid Supabase URL format');
    }

    // Analyze configuration problems
    const magicLinkRequests = testResults.networkRequests.filter((r: any) => 
      r.url.includes('/api/test/magic-link')
    );

    if (magicLinkRequests.length === 0) {
      analysis.configurationProblems.push('No magic link generation requests found');
    }

    const failedRequests = testResults.networkRequests.filter((r: any) => r.status >= 400);
    if (failedRequests.length > 0) {
      analysis.configurationProblems.push(`${failedRequests.length} failed network requests`);
    }

    // Analyze authentication flow
    if (testResults.finalUrl.includes('%2A') || testResults.finalUrl.includes('*.vercel.app')) {
      analysis.authenticationFlow.push('Magic link redirects to wrong domain (wildcard)');
    }

    if (!testResults.success) {
      analysis.authenticationFlow.push('Authentication flow did not complete successfully');
    }

    // Generate recommendations
    if (analysis.environmentIssues.length > 0) {
      analysis.recommendations.push('Fix environment configuration issues');
    }

    if (analysis.configurationProblems.length > 0) {
      analysis.recommendations.push('Review and fix configuration problems');
    }

    if (analysis.authenticationFlow.length > 0) {
      analysis.recommendations.push('Check Supabase redirect URL configuration');
      analysis.recommendations.push('Verify admin email allowlist configuration');
    }

    if (testResults.finalUrl.includes('%2A')) {
      analysis.recommendations.push('Update Supabase Site URL and Redirect URLs to use actual domain instead of wildcard');
    }

    console.log('[Debugger] Analysis generated:', analysis);
    return analysis;
  }

  /**
   * Generate comprehensive report
   */
  async generateComprehensiveReport(testResults: any) {
    console.log('[Debugger] 📄 Generating comprehensive report');
    
    const reportPath = path.join(this.reportsDir, `magic-link-debug-${Date.now()}.json`);
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
      console.log('[Debugger] Report saved to:', reportPath);
      
      // Also generate HTML report
      const htmlReportPath = path.join(this.reportsDir, `magic-link-debug-${Date.now()}.html`);
      const htmlContent = this.generateHtmlReport(testResults);
      fs.writeFileSync(htmlReportPath, htmlContent);
      console.log('[Debugger] HTML report saved to:', htmlReportPath);
      
      return { jsonPath: reportPath, htmlPath: htmlReportPath };
    } catch (error) {
      console.error('[Debugger] Failed to generate report:', error);
      return null;
    }
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(testResults: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Magic Link Debug Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .error { color: #d32f2f; }
        .warning { color: #f57c00; }
        .success { color: #388e3c; }
        .code { background: #f5f5f5; padding: 10px; border-radius: 3px; font-family: monospace; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Magic Link Debug Report</h1>
        <p><strong>Timestamp:</strong> ${testResults.timestamp}</p>
        <p><strong>Environment:</strong> ${testResults.environment}</p>
        <p><strong>App URL:</strong> ${testResults.appUrl}</p>
        <p><strong>Supabase URL:</strong> ${testResults.supabaseUrl}</p>
        <p><strong>Success:</strong> <span class="${testResults.success ? 'success' : 'error'}">${testResults.success}</span></p>
    </div>

    <div class="section">
        <h2>Summary</h2>
        <p><strong>Total Errors:</strong> <span class="error">${testResults.errors.length}</span></p>
        <p><strong>Total Warnings:</strong> <span class="warning">${testResults.warnings.length}</span></p>
        <p><strong>Final URL:</strong> ${testResults.finalUrl}</p>
    </div>

    <div class="section">
        <h2>Analysis</h2>
        <h3>Environment Issues</h3>
        <ul>
            ${testResults.analysis.environmentIssues.map((issue: string) => `<li class="error">${issue}</li>`).join('')}
        </ul>
        
        <h3>Configuration Problems</h3>
        <ul>
            ${testResults.analysis.configurationProblems.map((problem: string) => `<li class="error">${problem}</li>`).join('')}
        </ul>
        
        <h3>Authentication Flow Issues</h3>
        <ul>
            ${testResults.analysis.authenticationFlow.map((issue: string) => `<li class="error">${issue}</li>`).join('')}
        </ul>
        
        <h3>Recommendations</h3>
        <ul>
            ${testResults.analysis.recommendations.map((rec: string) => `<li class="success">${rec}</li>`).join('')}
        </ul>
    </div>

    <div class="section">
        <h2>Steps</h2>
        <table>
            <tr><th>Step</th><th>Timestamp</th><th>Status</th></tr>
            ${testResults.steps.map((step: any) => `
                <tr>
                    <td>${step.step}</td>
                    <td>${step.timestamp}</td>
                    <td>${step.errors ? `<span class="error">Failed</span>` : `<span class="success">Success</span>`}</td>
                </tr>
            `).join('')}
        </table>
    </div>

    <div class="section">
        <h2>Network Requests</h2>
        <table>
            <tr><th>URL</th><th>Method</th><th>Status</th><th>Timestamp</th></tr>
            ${testResults.networkRequests.map((req: any) => `
                <tr>
                    <td>${req.url}</td>
                    <td>${req.method}</td>
                    <td class="${req.status >= 400 ? 'error' : 'success'}">${req.status}</td>
                    <td>${req.timestamp}</td>
                </tr>
            `).join('')}
        </table>
    </div>

    <div class="section">
        <h2>Errors</h2>
        <table>
            <tr><th>Type</th><th>Message</th><th>Timestamp</th></tr>
            ${testResults.errors.map((error: any) => `
                <tr>
                    <td>${error.type}</td>
                    <td>${error.message}</td>
                    <td>${error.timestamp}</td>
                </tr>
            `).join('')}
        </table>
    </div>
</body>
</html>
    `;
  }
}
