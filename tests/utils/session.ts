import type { APIRequestContext, Page } from '@playwright/test';

/**
 * Session and Request Context Helpers for Test-Only Adaptors
 * 
 * These helpers provide test-only functionality for correlation tracking
 * and admin authentication without modifying core server code.
 */

export type RequestContextWithCorrelation = {
  req: APIRequestContext;
  correlationId: string;
};

/**
 * Creates a new request context with correlation ID for system-truth verification
 * @param acId The acceptance criteria ID (AC1-AC6)
 * @returns Request context with correlation ID headers
 */
export function newRequestContextWithCorrelation(acId: 'AC1' | 'AC2' | 'AC3' | 'AC4' | 'AC5' | 'AC6'): RequestContextWithCorrelation {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const correlationId = `${acId}-${timestamp}-${randomSuffix}`;
  
  // Note: The actual request context will be provided by Playwright
  // This function returns the correlation ID and headers to be used
  return {
    req: null as any, // Will be replaced with actual context in specs
    correlationId
  };
}

/**
 * Signs in as super admin for audit log access (test-only)
 * @param pageOrReq Playwright page or request context
 * @returns Promise resolving to admin session info
 */
export async function signInAsSuperAdmin(pageOrReq: Page | APIRequestContext): Promise<{
  isAuthenticated: boolean;
  sessionInfo?: {
    email: string;
    role: string;
  };
  error?: string;
}> {
  const adminEmail = process.env.TEST_SUPERADMIN_EMAIL;
  const adminPassword = process.env.TEST_SUPERADMIN_PASSWORD;
  
  if (!adminEmail) {
    return {
      isAuthenticated: false,
      error: 'TEST_SUPERADMIN_EMAIL not configured - audit reads will be BLOCKED'
    };
  }
  
  try {
    // Try to use existing sign-in method from the app
    if ('goto' in pageOrReq) {
      // It's a Page object
      const page = pageOrReq as Page;
      
      // Navigate to admin login (assuming there's an admin login page)
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      
      // Try to fill login form if it exists
      const emailInput = page.locator('input[name="email"], input[type="email"]').first();
      const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
      const submitButton = page.locator('button[type="submit"], input[type="submit"]').first();
      
      if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
        await emailInput.fill(adminEmail);
        if (adminPassword) {
          await passwordInput.fill(adminPassword);
        }
        
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForLoadState('networkidle');
          
          // Check if login was successful
          const currentUrl = page.url();
          if (currentUrl.includes('/admin') && !currentUrl.includes('/login')) {
            return {
              isAuthenticated: true,
              sessionInfo: {
                email: adminEmail,
                role: 'super_admin'
              }
            };
          }
        }
      }
    } else {
      // It's an APIRequestContext - try API-based auth
      const req = pageOrReq as APIRequestContext;
      
      try {
        const response = await req.post('/api/admin/auth/login', {
          data: {
            email: adminEmail,
            password: adminPassword || 'test-password'
          }
        });
        
        if (response.ok()) {
          const data = await response.json();
          if (data.success || data.token) {
            return {
              isAuthenticated: true,
              sessionInfo: {
                email: adminEmail,
                role: 'super_admin'
              }
            };
          }
        }
      } catch (apiError) {
        // API login failed, continue to fallback
      }
    }
    
    // Fallback: assume admin session exists if email is configured
    // This allows tests to proceed with BLOCKED audit assertions
    return {
      isAuthenticated: false,
      error: `Admin authentication failed for ${adminEmail} - audit reads will be BLOCKED`
    };
    
  } catch (error) {
    return {
      isAuthenticated: false,
      error: `Admin sign-in error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Creates a request context with correlation ID and admin headers
 * @param acId The acceptance criteria ID
 * @param req Playwright API request context
 * @returns Enhanced request context with correlation tracking
 */
export function createCorrelatedRequest(acId: 'AC1' | 'AC2' | 'AC3' | 'AC4' | 'AC5' | 'AC6', req: APIRequestContext): {
  req: APIRequestContext;
  correlationId: string;
  headers: Record<string, string>;
} {
  const { correlationId } = newRequestContextWithCorrelation(acId);
  
  return {
    req,
    correlationId,
    headers: {
      'x-correlation-id': correlationId,
      'x-test-helpers-enabled': '1',
      'Content-Type': 'application/json'
    }
  };
}

export function createSession() {
  // Legacy stub - kept for compatibility
  return {};
}
