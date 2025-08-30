import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../../app/api/admin/me/route';

// Mock environment variables for testing
const mockEnv = {
      SUPER_ADMIN_EMAILS: 'alice@company.com, bob@company.com',
  ADMIN_PAYMENT_EMAILS: 'bob@company.com, carol@company.com',
  ADMIN_PROFILE_EMAILS: 'carol@company.com, dave@company.com',
  ADMIN_TCC_EMAILS: 'dave@company.com, eve@company.com',
  BUILD_ID: 'test123',
};

// Mock NextRequest for testing
function createMockRequest(adminEmail?: string): NextRequest {
  const cookies: Record<string, string> = {};
  if (adminEmail) {
    cookies['admin-email'] = adminEmail;
  }

  const cookieHeader = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');

  const headers = new Headers();
  if (cookieHeader) {
    headers.set('cookie', cookieHeader);
  }

  return new NextRequest('http://localhost:3000/api/admin/me', {
    headers,
  });
}

describe('Admin /me Endpoint Tests', () => {
  beforeAll(() => {
    // Set up environment variables for testing
    Object.defineProperty(process, 'env', {
      value: {
        ...process.env,
        ...mockEnv,
        NODE_ENV: 'test',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
      },
      writable: true,
    });
  });

  afterAll(() => {
    // Clean up environment variables
    Object.defineProperty(process, 'env', {
      value: process.env,
      writable: true,
    });
  });

  describe('GET /api/admin/me', () => {
    it('should return 401 for unauthenticated request', async () => {
      const request = createMockRequest();
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Not authenticated');
    });

    it('should return 403 for non-admin user', async () => {
      const request = createMockRequest('unknown@company.com');
      const response = await GET(request);
      
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Not authorized');
    });

    it('should return user info for super admin', async () => {
      const request = createMockRequest('alice@company.com');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body.email).toBe('alice@company.com');
      expect(body.roles).toContain('super_admin');
      expect(body.envBuildId).toBeDefined();
    });

    it('should return user info for payment admin', async () => {
      const request = createMockRequest('carol@company.com');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body.email).toBe('carol@company.com');
      expect(body.roles).toContain('admin_payment');
      expect(body.roles).toContain('admin_profile');
      expect(body.roles).not.toContain('super_admin');
      expect(body.envBuildId).toBeDefined();
    });

    it('should handle case-insensitive email matching', async () => {
      const request = createMockRequest('ALICE@COMPANY.COM');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body.email).toBe('alice@company.com'); // Should be normalized
      expect(body.roles).toContain('super_admin');
    });

    it('should handle whitespace in email', async () => {
      const request = createMockRequest(' alice@company.com ');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body.email).toBe('alice@company.com'); // Should be normalized
      expect(body.roles).toContain('super_admin');
    });
  });
});
