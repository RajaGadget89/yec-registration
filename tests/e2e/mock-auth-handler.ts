import { Page } from '@playwright/test';

export interface MockAuthTokens {
  access_token: string;
  refresh_token: string;
  user_email?: string;
}

export interface MockAuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role?: string;
  };
  error?: string;
  status?: number;
}

export class MockAuthHandler {
  private page: Page;
  private mockUsers: Map<string, MockAuthResponse>;

  constructor(page: Page) {
    this.page = page;
    this.mockUsers = new Map();
    this.setupDefaultMockUsers();
  }

  private setupDefaultMockUsers() {
    // Mock admin user
    this.mockUsers.set('valid_access_token_12345', {
      success: true,
      user: {
        id: 'admin-user-1',
        email: 'raja.gadgets89@gmail.com',
        role: 'admin'
      }
    });

    // Mock non-admin user
    this.mockUsers.set('non_admin_access_token', {
      success: true,
      user: {
        id: 'user-1',
        email: 'user@example.com',
        role: 'user'
      }
    });

    // Mock invalid token
    this.mockUsers.set('invalid', {
      success: false,
      error: 'Invalid authentication tokens',
      status: 401
    });
  }

  async setupMockAuthAPI() {
    await this.page.route('**/api/auth/callback', async (route) => {
      const request = route.request();
      const method = request.method();
      
      if (method !== 'POST') {
        await route.fulfill({
          status: 405,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Method not allowed' })
        });
        return;
      }

      try {
        const body = await request.json();
        const { access_token, refresh_token } = body;

        if (!access_token || !refresh_token) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Missing authentication tokens' })
          });
          return;
        }

        // Check if we have a mock response for this token
        const mockResponse = this.mockUsers.get(access_token);
        
        if (!mockResponse || !mockResponse.success) {
          await route.fulfill({
            status: mockResponse?.status || 401,
            contentType: 'application/json',
            body: JSON.stringify({ 
              message: mockResponse?.error || 'Invalid authentication tokens' 
            })
          });
          return;
        }

        const user = mockResponse.user!;
        
        // Check if user is admin (simulate the isAdmin function)
        const adminEmails = ['raja.gadgets89@gmail.com']; // Mock admin list
        const isAdmin = adminEmails.includes(user.email.toLowerCase());

        if (!isAdmin) {
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Access denied. Admin privileges required.' })
          });
          return;
        }

        // Success response - redirect with cookies
        const response = {
          status: 303,
          headers: {
            'Location': '/admin',
            'Set-Cookie': [
              `sb-access-token=${access_token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`,
              `sb-refresh-token=${refresh_token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`,
              `admin-email=${user.email}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`
            ]
          }
        };

        await route.fulfill(response);

      } catch (error) {
        console.error('Mock auth handler error:', error);
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Unexpected error during authentication' })
        });
      }
    });
  }

  async addMockUser(token: string, response: MockAuthResponse) {
    this.mockUsers.set(token, response);
  }

  async removeMockUser(token: string) {
    this.mockUsers.delete(token);
  }

  async clearMockUsers() {
    this.mockUsers.clear();
    this.setupDefaultMockUsers();
  }

  // Helper method to generate valid mock tokens
  generateMockTokens(email: string = 'raja.gadgets89@gmail.com'): MockAuthTokens {
    const timestamp = Date.now();
    const access_token = `mock_access_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    const refresh_token = `mock_refresh_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add to mock users
    this.mockUsers.set(access_token, {
      success: true,
      user: {
        id: `user-${timestamp}`,
        email: email,
        role: email === 'raja.gadgets89@gmail.com' ? 'admin' : 'user'
      }
    });

    return { access_token, refresh_token, user_email: email };
  }

  // Helper method to simulate magic link callback
  async simulateMagicLinkCallback(tokens: MockAuthTokens) {
    await this.page.goto(`/auth/callback#access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`);
  }

  // Helper method to check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const cookies = await this.page.context().cookies();
    const authCookies = cookies.filter(cookie => 
      ['sb-access-token', 'sb-refresh-token', 'admin-email'].includes(cookie.name)
    );
    return authCookies.length === 3;
  }

  // Helper method to get current user email from cookies
  async getCurrentUserEmail(): Promise<string | null> {
    const cookies = await this.page.context().cookies();
    const adminEmailCookie = cookies.find(cookie => cookie.name === 'admin-email');
    return adminEmailCookie?.value || null;
  }
}

export function createMockAuthHandler(page: Page): MockAuthHandler {
  return new MockAuthHandler(page);
}
