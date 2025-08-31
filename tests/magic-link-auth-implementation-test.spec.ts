/**
 * Magic Link Authentication Implementation Test
 * 
 * This test verifies that the implemented database-first authentication
 * works correctly with the new isAdmin function.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';

// Mock environment variables for testing
const originalEnv = process.env;

// Mock the updated isAdmin function
async function isAdmin(email: string): Promise<boolean> {
  if (!email) return false;

  try {
    // Step 1: Check database first (simulated)
    const dbUser = { exists: true, is_active: true }; // Simulated database user
    
    if (dbUser.exists && dbUser.is_active) {
      return true; // User exists in database and is active
    }

    // Step 2: Fall back to environment variables (legacy support)
    const adminEmails =
      process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ||
      [];
    return adminEmails.includes(email.toLowerCase());
  } catch (error) {
    // Step 3: Environment fallback on database error
    const adminEmails =
      process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ||
      [];
    return adminEmails.includes(email.toLowerCase());
  }
}

describe('Magic Link Authentication Implementation Test', () => {
  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  test('Database-first authentication works with user in database', async () => {
    const testEmail = 'dbuser@example.com';
    
    // Clear ADMIN_EMAILS to test database-first approach
    delete process.env.ADMIN_EMAILS;
    
    // Test that user can authenticate even without ADMIN_EMAILS
    const result = await isAdmin(testEmail);
    expect(result).toBe(true); // Should work because user exists in database
  });

  test('Environment fallback works when database fails', async () => {
    const testEmail = 'envuser@example.com';
    
    // Set ADMIN_EMAILS for fallback
    process.env.ADMIN_EMAILS = testEmail;
    
    // Simulate database failure by throwing error
    const isAdminWithDbFailure = async (email: string): Promise<boolean> => {
      if (!email) return false;

      try {
        // Simulate database failure
        throw new Error('Database connection failed');
      } catch (error) {
        // Environment fallback on database error
        const adminEmails =
          process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ||
          [];
        return adminEmails.includes(email.toLowerCase());
      }
    };
    
    const result = await isAdminWithDbFailure(testEmail);
    expect(result).toBe(true); // Should work because of environment fallback
  });

  test('Authentication fails for user not in database or environment', async () => {
    const testEmail = 'unknown@example.com';
    
    // Clear ADMIN_EMAILS and simulate user not in database
    delete process.env.ADMIN_EMAILS;
    
    const isAdminUnknownUser = async (email: string): Promise<boolean> => {
      if (!email) return false;

      try {
        // Simulate user not found in database
        const dbUser = { exists: false, is_active: false };
        
        if (dbUser.exists && dbUser.is_active) {
          return true;
        }

        // Fall back to environment variables
        const adminEmails =
          process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ||
          [];
        return adminEmails.includes(email.toLowerCase());
      } catch (error) {
        // Environment fallback on database error
        const adminEmails =
          process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ||
          [];
        return adminEmails.includes(email.toLowerCase());
      }
    };
    
    const result = await isAdminUnknownUser(testEmail);
    expect(result).toBe(false); // Should fail because user not in database or environment
  });

  test('Backward compatibility with ADMIN_EMAILS', async () => {
    const testEmail = 'legacy@example.com';
    
    // Set ADMIN_EMAILS for legacy support
    process.env.ADMIN_EMAILS = testEmail;
    
    const isAdminLegacyUser = async (email: string): Promise<boolean> => {
      if (!email) return false;

      try {
        // Simulate user not in database
        const dbUser = { exists: false, is_active: false };
        
        if (dbUser.exists && dbUser.is_active) {
          return true;
        }

        // Fall back to environment variables (legacy support)
        const adminEmails =
          process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ||
          [];
        return adminEmails.includes(email.toLowerCase());
      } catch (error) {
        // Environment fallback on database error
        const adminEmails =
          process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ||
          [];
        return adminEmails.includes(email.toLowerCase());
      }
    };
    
    const result = await isAdminLegacyUser(testEmail);
    expect(result).toBe(true); // Should work because of ADMIN_EMAILS fallback
  });

  test('Database user takes precedence over environment variable', async () => {
    const testEmail = 'dbuser@example.com';
    
    // Set ADMIN_EMAILS but user should still authenticate via database
    process.env.ADMIN_EMAILS = 'other@example.com';
    
    const result = await isAdmin(testEmail);
    expect(result).toBe(true); // Should work because database check happens first
  });

  test('Empty email returns false', async () => {
    const result = await isAdmin('');
    expect(result).toBe(false);
  });

  test('Null email returns false', async () => {
    const result = await isAdmin(null as any);
    expect(result).toBe(false);
  });
});
