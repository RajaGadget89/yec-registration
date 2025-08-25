import { Page } from '@playwright/test';

/**
 * Error Capture Helper
 * 
 * Comprehensive error capture and logging for magic link authentication testing.
 * Captures browser console logs, network errors, page errors, and request failures.
 */

export class ErrorCapture {
  private page: Page;
  private capturedErrors: any[] = [];
  private capturedWarnings: any[] = [];
  private capturedLogs: any[] = [];
  private networkRequests: any[] = [];
  private networkResponses: any[] = [];
  private requestFailures: any[] = [];
  private pageErrors: any[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Enable full error capture
   */
  async enableFullCapture() {
    console.log('[ErrorCapture] 🔍 Enabling comprehensive error capture');

    // Capture console messages
    this.page.on('console', (msg) => {
      const logEntry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString(),
        location: msg.location()
      };

      this.capturedLogs.push(logEntry);

      if (msg.type() === 'error') {
        this.capturedErrors.push(logEntry);
      } else if (msg.type() === 'warning') {
        this.capturedWarnings.push(logEntry);
      }

      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    // Capture network requests
    this.page.on('request', (request) => {
      const requestEntry = {
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        timestamp: new Date().toISOString(),
        resourceType: request.resourceType()
      };

      this.networkRequests.push(requestEntry);
      console.log(`[Network Request] ${request.method()} ${request.url()}`);
    });

    // Capture network responses
    this.page.on('response', (response) => {
      const responseEntry = {
        status: response.status(),
        url: response.url(),
        headers: response.headers(),
        timestamp: new Date().toISOString(),
        method: response.request().method()
      };

      this.networkResponses.push(responseEntry);
      console.log(`[Network Response] ${response.status()} ${response.url()}`);
    });

    // Capture request failures
    this.page.on('requestfailed', (request) => {
      const failureEntry = {
        url: request.url(),
        method: request.method(),
        failure: request.failure()?.errorText,
        timestamp: new Date().toISOString()
      };

      this.requestFailures.push(failureEntry);
      this.capturedErrors.push({
        type: 'request_failed',
        text: `Request failed: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`,
        timestamp: new Date().toISOString(),
        details: failureEntry
      });

      console.log(`[Request Failed] ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });

    // Capture page errors
    this.page.on('pageerror', (error) => {
      const errorEntry = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };

      this.pageErrors.push(errorEntry);
      this.capturedErrors.push({
        type: 'page_error',
        text: error.message,
        timestamp: new Date().toISOString(),
        details: errorEntry
      });

      console.log(`[Page Error] ${error.message}`);
    });

    // Capture unhandled rejections
    this.page.on('crash', () => {
      const crashEntry = {
        type: 'page_crash',
        text: 'Page crashed',
        timestamp: new Date().toISOString()
      };

      this.capturedErrors.push(crashEntry);
      console.log('[Page Crash] Page crashed unexpectedly');
    });

    console.log('[ErrorCapture] ✅ Full error capture enabled');
  }

  /**
   * Capture network activity
   */
  async captureNetworkActivity() {
    console.log('[ErrorCapture] 🌐 Capturing network activity');
    
    return {
      requests: this.networkRequests,
      responses: this.networkResponses,
      failures: this.requestFailures,
      summary: {
        totalRequests: this.networkRequests.length,
        totalResponses: this.networkResponses.length,
        totalFailures: this.requestFailures.length,
        successRate: this.networkRequests.length > 0 ? 
          ((this.networkRequests.length - this.requestFailures.length) / this.networkRequests.length * 100).toFixed(2) + '%' : '0%'
      }
    };
  }

  /**
   * Get captured errors
   */
  getCapturedErrors() {
    return this.capturedErrors;
  }

  /**
   * Get captured warnings
   */
  getCapturedWarnings() {
    return this.capturedWarnings;
  }

  /**
   * Get captured logs
   */
  getCapturedLogs() {
    return this.capturedLogs;
  }

  /**
   * Get network requests
   */
  getNetworkRequests() {
    return this.networkRequests;
  }

  /**
   * Get network responses
   */
  getNetworkResponses() {
    return this.networkResponses;
  }

  /**
   * Get request failures
   */
  getRequestFailures() {
    return this.requestFailures;
  }

  /**
   * Get page errors
   */
  getPageErrors() {
    return this.pageErrors;
  }

  /**
   * Clear captured data
   */
  clear() {
    this.capturedErrors = [];
    this.capturedWarnings = [];
    this.capturedLogs = [];
    this.networkRequests = [];
    this.networkResponses = [];
    this.requestFailures = [];
    this.pageErrors = [];
    console.log('[ErrorCapture] 🧹 Cleared all captured data');
  }

  /**
   * Generate error summary
   */
  generateErrorSummary() {
    const summary = {
      totalErrors: this.capturedErrors.length,
      totalWarnings: this.capturedWarnings.length,
      totalLogs: this.capturedLogs.length,
      networkRequests: this.networkRequests.length,
      networkResponses: this.networkResponses.length,
      requestFailures: this.requestFailures.length,
      pageErrors: this.pageErrors.length,
      errorTypes: this.categorizeErrors(),
      criticalErrors: this.getCriticalErrors()
    };

    console.log('[ErrorCapture] 📊 Error summary generated:', summary);
    return summary;
  }

  /**
   * Categorize errors by type
   */
  private categorizeErrors() {
    const categories: any = {};
    
    this.capturedErrors.forEach(error => {
      const type = error.type || 'unknown';
      if (!categories[type]) {
        categories[type] = 0;
      }
      categories[type]++;
    });

    return categories;
  }

  /**
   * Get critical errors that need immediate attention
   */
  private getCriticalErrors() {
    return this.capturedErrors.filter(error => {
      const text = error.text?.toLowerCase() || '';
      return text.includes('%2a.vercel.app') ||
             text.includes('dns') ||
             text.includes('network') ||
             text.includes('authentication') ||
             text.includes('session') ||
             text.includes('token') ||
             text.includes('expired');
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('[ErrorCapture] 🧹 Cleaning up error capture resources');
    this.clear();
  }
}

