import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getRolesForEmail, 
  canReviewDimension, 
  canApprove, 
  getUsersWithRole,
  getRoleStats,
  validateRBACConfig,
  type Role,
  type Dimension
} from '../../app/lib/rbac';

// Mock environment variables
const mockEnv = {
      SUPER_ADMIN_EMAILS: 'alice@company.com, bob@company.com',
  ADMIN_PAYMENT_EMAILS: 'bob@company.com, carol@company.com',
  ADMIN_PROFILE_EMAILS: 'carol@company.com, dave@company.com',
  ADMIN_TCC_EMAILS: 'dave@company.com, eve@company.com',
};

describe('RBAC System', () => {
  beforeEach(() => {
    // Reset environment variables before each test
    vi.resetModules();
    
    // Mock process.env
    Object.defineProperty(process, 'env', {
      value: mockEnv,
      writable: true,
    });
  });

  describe('getRolesForEmail', () => {
    it('should return empty set for non-admin email', () => {
      const roles = getRolesForEmail('unknown@company.com');
      expect(roles.size).toBe(0);
    });

    it('should return super_admin role for super admin email', () => {
      const roles = getRolesForEmail('alice@company.com');
      expect(roles.has('super_admin')).toBe(true);
      expect(roles.size).toBe(1);
    });

    it('should return multiple roles for user with multiple permissions', () => {
      const roles = getRolesForEmail('bob@company.com');
      expect(roles.has('super_admin')).toBe(true);
      expect(roles.has('admin_payment')).toBe(true);
      expect(roles.size).toBe(2);
    });

    it('should handle case-insensitive email matching', () => {
      const roles = getRolesForEmail('ALICE@COMPANY.COM');
      expect(roles.has('super_admin')).toBe(true);
    });

    it('should handle whitespace in email addresses', () => {
      const roles = getRolesForEmail(' bob@company.com ');
      expect(roles.has('super_admin')).toBe(true);
      expect(roles.has('admin_payment')).toBe(true);
    });

    it('should return empty set for empty email', () => {
      const roles = getRolesForEmail('');
      expect(roles.size).toBe(0);
    });

    it('should return empty set for null email', () => {
      const roles = getRolesForEmail(null as any);
      expect(roles.size).toBe(0);
    });
  });

  describe('canReviewDimension', () => {
    it('should allow super admin to review all dimensions', () => {
      expect(canReviewDimension('alice@company.com', 'payment')).toBe(true);
      expect(canReviewDimension('alice@company.com', 'profile')).toBe(true);
      expect(canReviewDimension('alice@company.com', 'tcc')).toBe(true);
    });

    it('should allow payment admin to review payment only', () => {
      expect(canReviewDimension('carol@company.com', 'payment')).toBe(true);
      expect(canReviewDimension('carol@company.com', 'profile')).toBe(true);
      expect(canReviewDimension('carol@company.com', 'tcc')).toBe(false);
    });

    it('should allow profile admin to review profile only', () => {
      expect(canReviewDimension('dave@company.com', 'payment')).toBe(false);
      expect(canReviewDimension('dave@company.com', 'profile')).toBe(true);
      expect(canReviewDimension('dave@company.com', 'tcc')).toBe(true);
    });

    it('should deny access to non-admin users', () => {
      expect(canReviewDimension('unknown@company.com', 'payment')).toBe(false);
      expect(canReviewDimension('unknown@company.com', 'profile')).toBe(false);
      expect(canReviewDimension('unknown@company.com', 'tcc')).toBe(false);
    });

    it('should handle case-insensitive email matching', () => {
      expect(canReviewDimension('ALICE@COMPANY.COM', 'payment')).toBe(true);
    });
  });

  describe('canApprove', () => {
    it('should allow super admin to approve', () => {
      expect(canApprove('alice@company.com')).toBe(true);
    });

    it('should deny non-super admin users from approving', () => {
      expect(canApprove('carol@company.com')).toBe(false);
      expect(canApprove('dave@company.com')).toBe(false);
      expect(canApprove('eve@company.com')).toBe(false);
    });

    it('should deny unknown users from approving', () => {
      expect(canApprove('unknown@company.com')).toBe(false);
    });

    it('should handle case-insensitive email matching', () => {
      expect(canApprove('ALICE@COMPANY.COM')).toBe(true);
    });
  });

  describe('getUsersWithRole', () => {
    it('should return correct users for super_admin role', () => {
      const users = getUsersWithRole('super_admin');
      expect(users).toContain('alice@company.com');
      expect(users).toContain('bob@company.com');
      expect(users.length).toBe(2);
    });

    it('should return correct users for admin_payment role', () => {
      const users = getUsersWithRole('admin_payment');
      expect(users).toContain('bob@company.com');
      expect(users).toContain('carol@company.com');
      expect(users.length).toBe(2);
    });

    it('should return correct users for admin_profile role', () => {
      const users = getUsersWithRole('admin_profile');
      expect(users).toContain('carol@company.com');
      expect(users).toContain('dave@company.com');
      expect(users.length).toBe(2);
    });

    it('should return correct users for admin_tcc role', () => {
      const users = getUsersWithRole('admin_tcc');
      expect(users).toContain('dave@company.com');
      expect(users).toContain('eve@company.com');
      expect(users.length).toBe(2);
    });
  });

  describe('getRoleStats', () => {
    it('should return correct role statistics', () => {
      const stats = getRoleStats();
      expect(stats.super_admin).toBe(2);
      expect(stats.admin_payment).toBe(2);
      expect(stats.admin_profile).toBe(2);
      expect(stats.admin_tcc).toBe(2);
    });
  });

  describe('validateRBACConfig', () => {
    it('should return true for valid configuration', () => {
      const isValid = validateRBACConfig();
      expect(isValid).toBe(true);
    });

    it('should return false when no super admin is configured', () => {
      // Mock empty super admin list
      Object.defineProperty(process, 'env', {
        value: {
          ...mockEnv,
          SUPER_ADMIN_EMAILS: '',
        },
        writable: true,
      });

      // Re-import the module to get fresh state
      vi.resetModules();
      const { validateRBACConfig } = require('../../app/lib/rbac');
      
      const isValid = validateRBACConfig();
      expect(isValid).toBe(false);
    });

    it('should return false when no admin users are configured', () => {
      // Mock empty admin lists
      Object.defineProperty(process, 'env', {
        value: {
          SUPER_ADMIN_EMAILS: '',
          ADMIN_PAYMENT_EMAILS: '',
          ADMIN_PROFILE_EMAILS: '',
          ADMIN_TCC_EMAILS: '',
        },
        writable: true,
      });

      // Re-import the module to get fresh state
      vi.resetModules();
      const { validateRBACConfig } = require('../../app/lib/rbac');
      
      const isValid = validateRBACConfig();
      expect(isValid).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty environment variables', () => {
      Object.defineProperty(process, 'env', {
        value: {},
        writable: true,
      });

      vi.resetModules();
      const { getRolesForEmail, canReviewDimension, canApprove } = require('../../app/lib/rbac');
      
      expect(getRolesForEmail('alice@company.com').size).toBe(0);
      expect(canReviewDimension('alice@company.com', 'payment')).toBe(false);
      expect(canApprove('alice@company.com')).toBe(false);
    });

    it('should handle malformed environment variables', () => {
      Object.defineProperty(process, 'env', {
        value: {
          SUPER_ADMIN_EMAILS: 'alice@company.com,,bob@company.com,  ,',
          ADMIN_PAYMENT_EMAILS: '  ,carol@company.com,',
        },
        writable: true,
      });

      vi.resetModules();
      const { getRolesForEmail, getUsersWithRole } = require('../../app/lib/rbac');
      
      const aliceRoles = getRolesForEmail('alice@company.com');
      const bobRoles = getRolesForEmail('bob@company.com');
      const carolRoles = getRolesForEmail('carol@company.com');
      
      expect(aliceRoles.has('super_admin')).toBe(true);
      expect(bobRoles.has('super_admin')).toBe(true);
      expect(carolRoles.has('admin_payment')).toBe(true);
      
      const superAdmins = getUsersWithRole('super_admin');
      expect(superAdmins).toContain('alice@company.com');
      expect(superAdmins).toContain('bob@company.com');
      expect(superAdmins.length).toBe(2);
    });
  });
});
