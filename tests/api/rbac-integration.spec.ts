import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { parse } from 'url';
import { NextRequest } from 'next/server';
import { validateDimensionAccess, validateApprovalAccess } from '../../app/lib/admin-guard-server';
import type { Dimension } from '../../app/lib/rbac';

// Mock environment variables for testing
const mockEnv = {
      SUPER_ADMIN_EMAILS: 'alice@company.com, bob@company.com',
  ADMIN_PAYMENT_EMAILS: 'bob@company.com, carol@company.com',
  ADMIN_PROFILE_EMAILS: 'carol@company.com, dave@company.com',
  ADMIN_TCC_EMAILS: 'dave@company.com, eve@company.com',
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

  return new NextRequest('http://localhost:3000/api/admin/test', {
    headers,
  });
}

describe('RBAC Integration Tests', () => {
  beforeAll(() => {
    // Set up environment variables for testing
    Object.defineProperty(process, 'env', {
      value: {
        ...process.env,
        ...mockEnv,
        NODE_ENV: 'test',
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

  describe('validateDimensionAccess', () => {
    it('should allow super admin to access all dimensions', () => {
      const request = createMockRequest('alice@company.com');
      
      const paymentResult = validateDimensionAccess(request, 'payment');
      expect(paymentResult.valid).toBe(true);
      expect(paymentResult.adminEmail).toBe('alice@company.com');
      
      const profileResult = validateDimensionAccess(request, 'profile');
      expect(profileResult.valid).toBe(true);
      expect(profileResult.adminEmail).toBe('alice@company.com');
      
      const tccResult = validateDimensionAccess(request, 'tcc');
      expect(tccResult.valid).toBe(true);
      expect(tccResult.adminEmail).toBe('alice@company.com');
    });

    it('should allow payment admin to access payment dimension only', () => {
      const request = createMockRequest('carol@company.com');
      
      const paymentResult = validateDimensionAccess(request, 'payment');
      expect(paymentResult.valid).toBe(true);
      expect(paymentResult.adminEmail).toBe('carol@company.com');
      
      const profileResult = validateDimensionAccess(request, 'profile');
      expect(profileResult.valid).toBe(true);
      expect(profileResult.adminEmail).toBe('carol@company.com');
      
      const tccResult = validateDimensionAccess(request, 'tcc');
      expect(tccResult.valid).toBe(false);
      expect(tccResult.error).toContain('Access denied');
    });

    it('should allow profile admin to access profile dimension only', () => {
      const request = createMockRequest('dave@company.com');
      
      const paymentResult = validateDimensionAccess(request, 'payment');
      expect(paymentResult.valid).toBe(false);
      expect(paymentResult.error).toContain('Access denied');
      
      const profileResult = validateDimensionAccess(request, 'profile');
      expect(profileResult.valid).toBe(true);
      expect(profileResult.adminEmail).toBe('dave@company.com');
      
      const tccResult = validateDimensionAccess(request, 'tcc');
      expect(tccResult.valid).toBe(true);
      expect(tccResult.adminEmail).toBe('dave@company.com');
    });

    it('should deny access to non-admin users', () => {
      const request = createMockRequest('unknown@company.com');
      
      const paymentResult = validateDimensionAccess(request, 'payment');
      expect(paymentResult.valid).toBe(false);
      expect(paymentResult.error).toContain('Access denied');
      
      const profileResult = validateDimensionAccess(request, 'profile');
      expect(profileResult.valid).toBe(false);
      expect(profileResult.error).toContain('Access denied');
      
      const tccResult = validateDimensionAccess(request, 'tcc');
      expect(tccResult.valid).toBe(false);
      expect(tccResult.error).toContain('Access denied');
    });

    it('should deny access when no admin email is provided', () => {
      const request = createMockRequest();
      
      const paymentResult = validateDimensionAccess(request, 'payment');
      expect(paymentResult.valid).toBe(false);
      expect(paymentResult.error).toContain('No admin email found');
    });

    it('should handle case-insensitive email matching', () => {
      const request = createMockRequest('ALICE@COMPANY.COM');
      
      const paymentResult = validateDimensionAccess(request, 'payment');
      expect(paymentResult.valid).toBe(true);
      expect(paymentResult.adminEmail).toBe('ALICE@COMPANY.COM');
    });
  });

  describe('validateApprovalAccess', () => {
    it('should allow super admin to approve', () => {
      const request = createMockRequest('alice@company.com');
      
      const result = validateApprovalAccess(request);
      expect(result.valid).toBe(true);
      expect(result.adminEmail).toBe('alice@company.com');
    });

    it('should deny non-super admin users from approving', () => {
      const request1 = createMockRequest('carol@company.com');
      const result1 = validateApprovalAccess(request1);
      expect(result1.valid).toBe(false);
      expect(result1.error).toContain('Only super admin users can approve');
      
      const request2 = createMockRequest('dave@company.com');
      const result2 = validateApprovalAccess(request2);
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('Only super admin users can approve');
      
      const request3 = createMockRequest('eve@company.com');
      const result3 = validateApprovalAccess(request3);
      expect(result3.valid).toBe(false);
      expect(result3.error).toContain('Only super admin users can approve');
    });

    it('should deny unknown users from approving', () => {
      const request = createMockRequest('unknown@company.com');
      
      const result = validateApprovalAccess(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Only super admin users can approve');
    });

    it('should deny access when no admin email is provided', () => {
      const request = createMockRequest();
      
      const result = validateApprovalAccess(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('No admin email found');
    });

    it('should handle case-insensitive email matching', () => {
      const request = createMockRequest('ALICE@COMPANY.COM');
      
      const result = validateApprovalAccess(request);
      expect(result.valid).toBe(true);
      expect(result.adminEmail).toBe('ALICE@COMPANY.COM');
    });
  });

  describe('Development Bypass', () => {
    it('should allow access when DEV_ADMIN_BYPASS is enabled', () => {
      // Enable development bypass
      Object.defineProperty(process, 'env', {
        value: {
          ...mockEnv,
          NODE_ENV: 'development',
          DEV_ADMIN_BYPASS: 'true',
        },
        writable: true,
      });

      const request = createMockRequest('unknown@company.com');
      
      const dimensionResult = validateDimensionAccess(request, 'payment');
      expect(dimensionResult.valid).toBe(true);
      expect(dimensionResult.adminEmail).toBe('dev-admin@example.com');
      
      const approvalResult = validateApprovalAccess(request);
      expect(approvalResult.valid).toBe(true);
      expect(approvalResult.adminEmail).toBe('dev-admin@example.com');
    });

    it('should not allow bypass in production', () => {
      // Set production environment
      Object.defineProperty(process, 'env', {
        value: {
          ...mockEnv,
          NODE_ENV: 'production',
          DEV_ADMIN_BYPASS: 'true',
        },
        writable: true,
      });

      const request = createMockRequest('unknown@company.com');
      
      const dimensionResult = validateDimensionAccess(request, 'payment');
      expect(dimensionResult.valid).toBe(false);
      
      const approvalResult = validateApprovalAccess(request);
      expect(approvalResult.valid).toBe(false);
    });
  });

  describe('Error Messages', () => {
    it('should provide clear error messages for dimension access', () => {
      const request = createMockRequest('unknown@company.com');
      
      const paymentResult = validateDimensionAccess(request, 'payment');
      expect(paymentResult.error).toContain('payment dimension');
      
      const profileResult = validateDimensionAccess(request, 'profile');
      expect(profileResult.error).toContain('profile dimension');
      
      const tccResult = validateDimensionAccess(request, 'tcc');
      expect(tccResult.error).toContain('tcc dimension');
    });

    it('should provide clear error messages for approval access', () => {
      const request = createMockRequest('carol@company.com');
      
      const result = validateApprovalAccess(request);
      expect(result.error).toContain('Only super admin users can approve');
    });
  });
});
