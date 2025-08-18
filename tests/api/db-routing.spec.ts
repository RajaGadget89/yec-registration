/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the environment variables
const originalEnv = process.env;

describe('Database Routing Validation', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should pass validation when SUPABASE_URL points to staging and SUPABASE_ENV is staging', async () => {
    // Set up staging environment
    process.env.SUPABASE_URL = 'https://staging-project.supabase.co';
    process.env.SUPABASE_ENV = 'staging';
    
    // Import the module (this will trigger the validation)
    const { assertDbRouting } = await import('../../app/lib/env-guards');
    
    // Should not throw
    expect(() => assertDbRouting()).not.toThrow();
  });

  it('should pass validation when SUPABASE_URL points to localhost and SUPABASE_ENV is localdev', async () => {
    // Set up local development environment
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.SUPABASE_ENV = 'localdev';
    
    // Import the module (this will trigger the validation)
    const { assertDbRouting } = await import('../../app/lib/env-guards');
    
    // Should not throw
    expect(() => assertDbRouting()).not.toThrow();
  });

  it('should throw error when SUPABASE_URL points to localhost and SUPABASE_ENV is staging', async () => {
    // Set up invalid configuration
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_ENV = 'staging';
    
    // Import the module (this will trigger the validation)
    const { assertDbRouting } = await import('../../app/lib/env-guards');
    
    // Should throw
    expect(() => assertDbRouting()).toThrow('[DB_ROUTING]');
  });

  it('should throw error when SUPABASE_URL points to 127.0.0.1 and SUPABASE_ENV is not localdev', async () => {
    // Set up invalid configuration
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.SUPABASE_ENV = 'production';
    
    // Import the module (this will trigger the validation)
    const { assertDbRouting } = await import('../../app/lib/env-guards');
    
    // Should throw
    expect(() => assertDbRouting()).toThrow('[DB_ROUTING]');
  });

  it('should default to staging when SUPABASE_ENV is not set', async () => {
    // Set up configuration without SUPABASE_ENV
    process.env.SUPABASE_URL = 'http://localhost:54321';
    delete process.env.SUPABASE_ENV;
    
    // Import the module (this will trigger the validation)
    const { assertDbRouting } = await import('../../app/lib/env-guards');
    
    // Should throw because it defaults to staging
    expect(() => assertDbRouting()).toThrow('[DB_ROUTING]');
  });
});
