/**
 * Magic Link Authentication Comprehensive Test
 * 
 * This test verifies that the real implementation matches our design
 * and works correctly in all scenarios.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';

// Mock environment variables for testing
const originalEnv = process.env;

// Import the real isAdmin function (we'll mock the database calls)
import { isAdmin } from '../app/lib/auth-utils';

// Mock the Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }))
};

// Mock the supabase-server module
jest.mock('../app/lib/supabase-server', () => ({
  getSupabaseServiceClient: () => mockSupabaseClient
}));

describe('Magic Link Authentication Comprehensive Test', () => {
  beforeEach(() => {
    // Reset environment variables and mocks
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  test('Database-first authentication: User exists in database', async () => {
    const testEmail = 'dbuser@example.com';
    
    // Clear ADMIN_EMAILS to test database-first approach
    delete process.env.ADMIN_EMAILS;
    
    // Mock database response: user exists and is active
    const mockSingle = jest.fn().mockResolvedValue({
      data: { email: testEmail, role: 'super_admin', is_active: true },
      error: null
    });
    
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle
          })
        })
      })
    });
    
    // Test that user can authenticate via database
    const result = await isAdmin(testEmail);
    
    expect(result).toBe(true);
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('admin_users');
  });

  test('Database-first authentication: User not in database, but in ADMIN_EMAILS', async () => {
    const testEmail = 'envuser@example.com';
    
    // Set ADMIN_EMAILS for fallback
    process.env.ADMIN_EMAILS = testEmail;
    
    // Mock database response: user not found
    const mockSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'No rows returned' }
    });
    
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle
          })
        })
      })
    });
    
    // Test that user can authenticate via environment fallback
    const result = await isAdmin(testEmail);
    
    expect(result).toBe(true);
  });

  test('Database-first authentication: User not in database or ADMIN_EMAILS', async () => {
    const testEmail = 'unknown@example.com';
    
    // Clear ADMIN_EMAILS
    delete process.env.ADMIN_EMAILS;
    
    // Mock database response: user not found
    const mockSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'No rows returned' }
    });
    
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle
          })
        })
      })
    });
    
    // Test that user cannot authenticate
    const result = await isAdmin(testEmail);
    
    expect(result).toBe(false);
  });

  test('Database error fallback: Should use ADMIN_EMAILS when database fails', async () => {
    const testEmail = 'envuser@example.com';
    
    // Set ADMIN_EMAILS for fallback
    process.env.ADMIN_EMAILS = testEmail;
    
    // Mock database to throw error
    const mockSingle = jest.fn().mockRejectedValue(new Error('Database connection failed'));
    
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle
          })
        })
      })
    });
    
    // Test that user can authenticate via environment fallback
    const result = await isAdmin(testEmail);
    
    expect(result).toBe(true);
  });

  test('Database user takes precedence over environment variable', async () => {
    const testEmail = 'dbuser@example.com';
    
    // Set ADMIN_EMAILS but user should still authenticate via database
    process.env.ADMIN_EMAILS = 'other@example.com';
    
    // Mock database response: user exists and is active
    const mockSingle = jest.fn().mockResolvedValue({
      data: { email: testEmail, role: 'super_admin', is_active: true },
      error: null
    });
    
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle
          })
        })
      })
    });
    
    // Test that user authenticates via database (not environment)
    const result = await isAdmin(testEmail);
    
    expect(result).toBe(true);
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('admin_users');
  });

  test('Empty email returns false', async () => {
    const result = await isAdmin('');
    expect(result).toBe(false);
  });

  test('Null email returns false', async () => {
    const result = await isAdmin(null as any);
    expect(result).toBe(false);
  });

  test('Database query uses correct parameters', async () => {
    const testEmail = 'test@example.com';
    
    // Mock database response
    const mockSingle = jest.fn().mockResolvedValue({
      data: { email: testEmail, role: 'admin', is_active: true },
      error: null
    });
    
    const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
    const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
    const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });
    
    mockSupabaseClient.from.mockImplementation(mockFrom);
    
    await isAdmin(testEmail);
    
    // Verify correct database query structure
    expect(mockFrom).toHaveBeenCalledWith('admin_users');
    expect(mockSelect).toHaveBeenCalledWith('email, role, is_active');
    expect(mockEq1).toHaveBeenCalledWith('email', testEmail.toLowerCase());
    expect(mockEq2).toHaveBeenCalledWith('is_active', true);
  });
});
