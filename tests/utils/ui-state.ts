import { Page } from '@playwright/test';
import { saveScreenshot as evidenceSaveScreenshot } from './evidence';

/**
 * UI-only helpers for reading DOM state without API calls
 * Used for P0 evidence collection
 */

export interface AdminInviteeRow {
  email: string;
  roles: string[];
  statusText: string | null;
}

export interface RegistrantStatus {
  email: string;
  statusText: string;
}

export interface FormLockAnalysis {
  nonTccLocked: boolean;
  checked: string[];
}

/**
 * Read admin invitee row from Admin Users table/list
 */
export async function readAdminInviteeRow(page: Page, email: string): Promise<AdminInviteeRow> {
  try {
    // Try to find the row by email
    const emailCell = page.locator(`text=${email}`).first();
    if (!(await emailCell.isVisible())) {
      return { email, roles: [], statusText: null };
    }

    // Find the parent row
    const row = emailCell.locator('xpath=ancestor::tr').first();
    
    // Extract roles (look for role badges or text)
    const roleElements = row.locator('[data-testid*="role"], .role-badge, .badge').all();
    const roles: string[] = [];
    for (const roleEl of await roleElements) {
      const roleText = await roleEl.textContent();
      if (roleText) roles.push(roleText.trim());
    }

    // Extract status text
    const statusEl = row.locator('[data-testid*="status"], .status, .badge').first();
    const statusText = await statusEl.textContent();

    return {
      email,
      roles,
      statusText: statusText?.trim() || null
    };
  } catch (error) {
    console.warn(`Failed to read admin invitee row for ${email}:`, error);
    return { email, roles: [], statusText: null };
  }
}

/**
 * Read registrant status from detail header/badge
 */
export async function readRegistrantStatus(page: Page, email: string): Promise<RegistrantStatus> {
  try {
    // Look for status in various common locations
    const statusSelectors = [
      '[data-testid="status"]',
      '.status-badge',
      '.badge',
      'h1 + .status',
      '.header .status'
    ];

    for (const selector of statusSelectors) {
      const statusEl = page.locator(selector).first();
      if (await statusEl.isVisible()) {
        const statusText = await statusEl.textContent();
        if (statusText?.trim()) {
          return { email, statusText: statusText.trim() };
        }
      }
    }

    // Fallback: look for any text that might be a status
    const pageText = await pageTextSnapshot(page, 1000);
    const statusMatch = pageText.match(/(?:status|state):\s*([a-z_]+)/i);
    if (statusMatch) {
      return { email, statusText: statusMatch[1] };
    }

    return { email, statusText: 'UNKNOWN' };
  } catch (error) {
    console.warn(`Failed to read registrant status for ${email}:`, error);
    return { email, statusText: 'UNKNOWN' };
  }
}

/**
 * Analyze form locks (assert non-TCC fields are disabled/readOnly)
 */
export async function analyzeFormLocks(page: Page): Promise<FormLockAnalysis> {
  try {
    // Common non-TCC field selectors
    const nonTccSelectors = [
      'input[name*="name"]',
      'input[name*="email"]', 
      'input[name*="phone"]',
      'input[name*="address"]',
      'select[name*="gender"]',
      'input[name*="birth"]',
      'textarea[name*="bio"]'
    ];

    const checked: string[] = [];
    let nonTccLocked = true;

    for (const selector of nonTccSelectors) {
      const elements = page.locator(selector).all();
      for (const element of await elements) {
        if (await element.isVisible()) {
          const isDisabled = await element.isDisabled();
          const isReadOnly = await element.getAttribute('readonly') !== null;
          const fieldName = await element.getAttribute('name') || selector;
          
          checked.push(fieldName);
          
          if (!isDisabled && !isReadOnly) {
            nonTccLocked = false;
          }
        }
      }
    }

    return { nonTccLocked, checked };
  } catch (error) {
    console.warn('Failed to analyze form locks:', error);
    return { nonTccLocked: false, checked: [] };
  }
}

/**
 * Get first N characters of visible text on page
 */
export async function pageTextSnapshot(page: Page, maxChars: number = 3000): Promise<string> {
  try {
    const text = await page.textContent('body');
    return text ? text.substring(0, maxChars) : '';
  } catch (error) {
    console.warn('Failed to get page text snapshot:', error);
    return '';
  }
}

/**
 * Take screenshot with evidence helper
 */
export async function screenshot(page: Page, runDir: string, name: string): Promise<string> {
  await evidenceSaveScreenshot(page, runDir, name);
  return `${name}.png`;
}

/**
 * Check if page shows error or blocked state
 */
export async function isPageBlocked(page: Page): Promise<{ blocked: boolean; reason?: string }> {
  try {
    const pageText = await pageTextSnapshot(page, 1000);
    
    // Common blocking indicators
    const blockingPatterns = [
      /unauthorized/i,
      /forbidden/i,
      /access denied/i,
      /login required/i,
      /authentication/i,
      /not found/i,
      /error/i
    ];

    for (const pattern of blockingPatterns) {
      if (pattern.test(pageText)) {
        return { blocked: true, reason: pattern.source };
      }
    }

    return { blocked: false };
  } catch (error) {
    return { blocked: true, reason: 'Failed to analyze page' };
  }
}

/**
 * Wait for page to be ready (no loading states)
 */
export async function waitForPageReady(page: Page, timeout: number = 5000): Promise<void> {
  try {
    // Wait for common loading indicators to disappear
    await page.waitForLoadState('networkidle', { timeout });
    
    // Wait for any loading spinners to disappear
    const loadingSelectors = [
      '.loading',
      '.spinner', 
      '[data-testid*="loading"]',
      '.animate-spin'
    ];
    
    for (const selector of loadingSelectors) {
      try {
        await page.waitForSelector(selector, { state: 'hidden', timeout: 1000 });
      } catch {
        // Ignore timeout, element might not exist
      }
    }
  } catch (error) {
    console.warn('Page ready check failed:', error);
  }
}

/**
 * Detect token reuse error on page
 */
export async function detectTokenReuseError(page: Page): Promise<{ hasError: boolean; errorText?: string; errorType?: string }> {
  try {
    const pageText = await pageTextSnapshot(page, 1000);
    
    // Common token reuse error patterns
    const errorPatterns = [
      { pattern: /invalid.*token/i, type: 'INVALID_TOKEN' },
      { pattern: /token.*expired/i, type: 'TOKEN_EXPIRED' },
      { pattern: /already.*accepted/i, type: 'ALREADY_ACCEPTED' },
      { pattern: /token.*used/i, type: 'TOKEN_USED' },
      { pattern: /unauthorized/i, type: 'UNAUTHORIZED' },
      { pattern: /forbidden/i, type: 'FORBIDDEN' },
      { pattern: /error/i, type: 'GENERIC_ERROR' }
    ];

    for (const { pattern, type } of errorPatterns) {
      const match = pageText.match(pattern);
      if (match) {
        return {
          hasError: true,
          errorText: match[0],
          errorType: type
        };
      }
    }

    return { hasError: false };
  } catch (error) {
    console.warn('Failed to detect token reuse error:', error);
    return { hasError: false };
  }
}
