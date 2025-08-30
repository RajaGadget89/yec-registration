import { APIRequestContext } from '@playwright/test';

/**
 * Helper function to authenticate as a super admin for E2E tests
 * @param request - Playwright API request context
 * @returns Promise<{ cookies: string[] }> - Authentication cookies to use in subsequent requests
 */
export async function loginAsSuperAdmin(request: APIRequestContext): Promise<{ cookies: string[] }> {
  try {
    // Call the super admin login endpoint
    const response = await request.get('/api/test/login-as-super-admin');
    
    if (response.status() !== 204) {
      throw new Error(`Super admin login failed with status ${response.status()}`);
    }

    // Extract cookies from the response
    const cookies = response.headers()['set-cookie'] || [];
    
    console.log('[superAdminAuth] Successfully authenticated as super admin');
    console.log('[superAdminAuth] Cookies set:', cookies.length);
    
    return { cookies };
  } catch (error) {
    console.error('[superAdminAuth] Failed to authenticate as super admin:', error);
    throw error;
  }
}

  /**
   * Helper function to get authenticated headers for super admin requests
   * @param request - Playwright API request context
   * @returns Promise<{ headers: Record<string, string> }> - Headers with authentication
   */
  export async function getSuperAdminHeaders(request: APIRequestContext): Promise<{ headers: Record<string, string> }> {
    // For testing, use admin-email header for API authentication
    // First ensure super admin is set up
    try {
      const setupResponse = await request.get('/api/test/setup-super-admin');
      if (setupResponse.status() !== 200) {
        console.warn('[superAdminAuth] Super admin setup failed:', await setupResponse.text());
      }
    } catch (error) {
      console.warn('[superAdminAuth] Super admin setup error:', error);
    }

    return {
      headers: {
        'Content-Type': 'application/json',
        'admin-email': 'raja.gadgets89@gmail.com',
      }
    };
  }

  /**
   * Helper function to get authenticated cookies for UI testing
   * @param request - Playwright API request context
   * @returns Promise<{ cookies: string[] }> - Cookies for UI authentication
   */
  export async function getSuperAdminCookies(request: APIRequestContext): Promise<{ cookies: string[] }> {
    // For UI testing, use cookies
    const response = await request.get('/api/test/login-as-super-admin');
    
    if (response.status() !== 204) {
      throw new Error(`Super admin login failed with status ${response.status()}`);
    }

    const cookies = response.headers()['set-cookie'] || [];
    return { cookies };
  }
