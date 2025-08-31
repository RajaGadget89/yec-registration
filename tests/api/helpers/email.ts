/**
 * Email utilities for API tests
 * Provides functions to generate unique emails for testing
 */

/**
 * Generate a unique email address for testing
 * @param prefix - Optional prefix for the email (default: 'test')
 * @param domain - Optional domain (default: 'example.com')
 * @returns Unique email address
 */
export function generateUniqueEmail(prefix: string = 'test', domain: string = 'example.com'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}.${timestamp}.${random}@${domain}`;
}

/**
 * Generate a unique email address with specific test context
 * @param testName - Name of the test for better identification
 * @param context - Additional context (e.g., 'happy', 'error', 'duplicate')
 * @param domain - Optional domain (default: 'example.com')
 * @returns Unique email address
 */
export function generateTestEmail(testName: string, context: string = '', domain: string = 'example.com'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const contextPart = context ? `.${context}` : '';
  return `${testName}${contextPart}.${timestamp}.${random}@${domain}`;
}

/**
 * Generate multiple unique emails for batch testing
 * @param count - Number of emails to generate
 * @param prefix - Optional prefix for the emails (default: 'batch')
 * @param domain - Optional domain (default: 'example.com')
 * @returns Array of unique email addresses
 */
export function generateUniqueEmails(count: number, prefix: string = 'batch', domain: string = 'example.com'): string[] {
  const emails: string[] = [];
  for (let i = 0; i < count; i++) {
    emails.push(generateUniqueEmail(`${prefix}${i}`, domain));
  }
  return emails;
}

/**
 * Generate email addresses for specific test scenarios
 * @param scenario - Test scenario name
 * @param count - Number of emails to generate
 * @param domain - Optional domain (default: 'example.com')
 * @returns Array of unique email addresses
 */
export function generateScenarioEmails(scenario: string, count: number, domain: string = 'example.com'): string[] {
  return generateUniqueEmails(count, scenario, domain);
}

/**
 * Validate email format (basic validation for testing)
 * @param email - Email address to validate
 * @returns true if email format is valid
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate invalid email addresses for testing validation
 * @returns Array of invalid email addresses
 */
export function getInvalidEmails(): string[] {
  return [
    'not-an-email',
    'missing@domain',
    '@missing-local.com',
    'spaces in@email.com',
    'double@@at.com',
    '',
    '   ',
    'no-at-sign.com',
    'multiple@at@signs.com',
    'trailing-dot@domain.',
    '.leading-dot@domain.com',
    'consecutive..dots@domain.com',
    'very-long-email-address-that-exceeds-reasonable-length-limits-for-email-addresses@very-long-domain-name-that-also-exceeds-reasonable-length-limits.com',
  ];
}

/**
 * Generate test email with specific characteristics
 * @param options - Options for email generation
 * @returns Generated email address
 */
export interface EmailOptions {
  prefix?: string;
  domain?: string;
  includeTimestamp?: boolean;
  includeRandom?: boolean;
  maxLength?: number;
}

export function generateCustomEmail(options: EmailOptions = {}): string {
  const {
    prefix = 'custom',
    domain = 'example.com',
    includeTimestamp = true,
    includeRandom = true,
    maxLength = 254, // RFC 5321 limit
  } = options;

  let email = prefix;

  if (includeTimestamp) {
    email += `.${Date.now()}`;
  }

  if (includeRandom) {
    email += `.${Math.random().toString(36).substring(2, 8)}`;
  }

  email += `@${domain}`;

  // Truncate if exceeds max length
  if (email.length > maxLength) {
    const atIndex = email.lastIndexOf('@');
    const localPart = email.substring(0, atIndex);
    const domainPart = email.substring(atIndex);
    const maxLocalLength = maxLength - domainPart.length;
    
    if (maxLocalLength > 0) {
      email = localPart.substring(0, maxLocalLength) + domainPart;
    } else {
      // If domain is too long, truncate it
      email = localPart + domainPart.substring(0, maxLength - localPart.length);
    }
  }

  return email;
}

/**
 * Generate emails for rate limiting tests
 * @param basePrefix - Base prefix for the emails
 * @param count - Number of emails to generate
 * @returns Array of unique email addresses
 */
export function generateRateLimitEmails(basePrefix: string = 'rate-limit', count: number = 10): string[] {
  return generateScenarioEmails(basePrefix, count);
}

/**
 * Generate emails for idempotency tests
 * @param basePrefix - Base prefix for the emails
 * @param count - Number of emails to generate
 * @returns Array of unique email addresses
 */
export function generateIdempotencyEmails(basePrefix: string = 'idempotency', count: number = 5): string[] {
  return generateScenarioEmails(basePrefix, count);
}

/**
 * Generate emails for validation tests
 * @param basePrefix - Base prefix for the emails
 * @param count - Number of emails to generate
 * @returns Array of unique email addresses
 */
export function generateValidationEmails(basePrefix: string = 'validation', count: number = 5): string[] {
  return generateScenarioEmails(basePrefix, count);
}

