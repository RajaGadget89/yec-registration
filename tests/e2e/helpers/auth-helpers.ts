import { Page, APIRequestContext } from '@playwright/test';
import { waitForOutboxLink } from './email-helpers';

/**
 * Login via magic link by triggering the magic link flow and using the generated link
 * @param page - Playwright page object
 * @param email - Email address to login with
 * @param baseUrl - Base URL of the application (default: from env or localhost:8080)
 * @returns Promise<void>
 */
export async function loginViaMagicLink(
  page: Page,
  email: string,
  baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'
): Promise<void> {
  console.log(`[auth-helpers] Starting magic link login for ${email}`);

  // Navigate to admin login page
  await page.goto(`${baseUrl}/admin/login`);
  
  // Wait for login page to load
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  
  // Fill in email
  await page.fill('input[type="email"]', email);
  
  // Click send magic link button
  await page.click('button:has-text("Send Magic Link")');
  
  // Wait for success message
  try {
    await page.waitForSelector('text=Magic link sent! Check your email.', { timeout: 5000 });
    console.log(`[auth-helpers] Magic link sent successfully for ${email}`);
  } catch (error) {
    // Check if rate limited
    const rateLimitText = await page.locator('text=For security purposes, you can only request this after').isVisible();
    if (rateLimitText) {
      console.log(`[auth-helpers] Rate limited, waiting for cooldown...`);
      // Wait for cooldown (usually 60 seconds)
      await page.waitForTimeout(60000);
      
      // Try again
      await page.click('button:has-text("Send Magic Link")');
      await page.waitForSelector('text=Magic link sent! Check your email.', { timeout: 10000 });
      console.log(`[auth-helpers] Magic link sent after cooldown for ${email}`);
    } else {
      throw new Error(`Failed to send magic link: ${error}`);
    }
  }

  // Wait for magic link to appear in outbox
  console.log(`[auth-helpers] Waiting for magic link in outbox...`);
  const magicLink = await waitForOutboxLink('magic', email, 30000);
  
  if (!magicLink.url) {
    throw new Error('No magic link URL found in outbox');
  }

  console.log(`[auth-helpers] Magic link found: ${magicLink.url}`);
  
  // Navigate to magic link
  await page.goto(magicLink.url);
  
  // Wait for redirect to admin dashboard
  try {
    await page.waitForURL(/.*\/admin/, { timeout: 15000 });
    console.log(`[auth-helpers] Successfully redirected to admin dashboard`);
  } catch (error) {
    // Check if we're on a callback page that needs to complete
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/callback')) {
      console.log(`[auth-helpers] On callback page, waiting for completion...`);
      await page.waitForURL(/.*\/admin/, { timeout: 15000 });
    } else {
      throw new Error(`Failed to redirect to admin dashboard: ${error}`);
    }
  }

  // Verify we're authenticated by checking for admin elements
  await page.waitForSelector('text=Admin', { timeout: 10000 });
  console.log(`[auth-helpers] Magic link login completed successfully for ${email}`);
}

/**
 * Check if user is authenticated and get their role
 * @param page - Playwright page object
 * @param baseUrl - Base URL of the application
 * @returns Promise<{ authenticated: boolean; role?: string; email?: string }>
 */
export async function checkAuthStatus(
  page: Page,
  baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'
): Promise<{ authenticated: boolean; role?: string; email?: string }> {
  try {
    // Call the /api/admin/me endpoint
    const response = await page.request.get(`${baseUrl}/api/admin/me`, {
      headers: { 'cache-control': 'no-store' }
    });

    if (response.status() === 200) {
      const userData = await response.json();
      return {
        authenticated: true,
        role: userData.role,
        email: userData.email
      };
    } else {
      return { authenticated: false };
    }
  } catch (error) {
    console.error(`[auth-helpers] Error checking auth status: ${error}`);
    return { authenticated: false };
  }
}

/**
 * Logout by clearing cookies and local storage
 * @param page - Playwright page object
 */
export async function logout(page: Page): Promise<void> {
  console.log(`[auth-helpers] Logging out...`);
  
  // Clear cookies
  await page.context().clearCookies();
  
  // Clear local storage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // Navigate to login page
  await page.goto('/admin/login');
  
  console.log(`[auth-helpers] Logout completed`);
}

/**
 * Wait for authentication to complete after magic link
 * @param page - Playwright page object
 * @param expectedRole - Expected role after authentication
 * @param timeoutMs - Timeout in milliseconds (default: 15000)
 */
export async function waitForAuthComplete(
  page: Page,
  expectedRole: string,
  timeoutMs: number = 15000
): Promise<void> {
  console.log(`[auth-helpers] Waiting for authentication to complete, expecting role: ${expectedRole}`);
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const authStatus = await checkAuthStatus(page);
      
      if (authStatus.authenticated && authStatus.role === expectedRole) {
        console.log(`[auth-helpers] Authentication completed successfully with role: ${authStatus.role}`);
        return;
      }
    } catch (error) {
      console.log(`[auth-helpers] Auth check error: ${error}`);
    }
    
    await page.waitForTimeout(1000);
  }
  
  throw new Error(`Timeout waiting for authentication to complete with role ${expectedRole}`);
}
