/**
 * CMS-specific authentication and authorization utilities
 * Provides granular permissions for Content Management System
 */

import { hasBusinessRole, getBusinessRoles } from './rbac';
import { getCurrentUser } from './auth-utils.server';

export type CMSPermission =
  | 'content_manage'
  | 'media_upload'
  | 'branding_manage'
  | 'content_publish'
  | 'news_manage'
  | 'templates_manage'
  | 'seo_optimize';

/**
 * Checks if user has CMS admin business role
 * @param email - User email address
 * @returns true if user has cms_admin role, false otherwise
 */
export async function hasCMSAdminRole(email: string): Promise<boolean> {
  return await hasBusinessRole(email, 'cms_admin');
}

/**
 * Checks if user has specific CMS permission
 * @param email - User email address
 * @param permission - CMS permission to check
 * @returns true if user has the permission, false otherwise
 */
export async function hasCMSPermission(
  email: string,
  permission: CMSPermission
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Super admin has all permissions
  if (user.role === 'super_admin') return true;

  // Check if user has cms_admin business role
  const hasCMSRole = await hasCMSAdminRole(email);
  if (!hasCMSRole) return false;

  // Map business role to specific permissions
  switch (permission) {
    case 'content_manage':
    case 'media_upload':
    case 'branding_manage':
    case 'content_publish':
    case 'news_manage':
    case 'templates_manage':
    case 'seo_optimize':
      return true; // cms_admin has all CMS permissions
    default:
      return false;
  }
}

/**
 * Gets CMS permissions for current user
 * @param email - User email address
 * @returns Array of CMS permissions
 */
export async function getCMSPermissions(email: string): Promise<CMSPermission[]> {
  const hasCMS = await hasCMSAdminRole(email);
  if (!hasCMS) return [];

  return [
    'content_manage',
    'media_upload',
    'branding_manage',
    'content_publish',
    'news_manage',
    'templates_manage',
    'seo_optimize'
  ];
}

/**
 * Checks if user can access CMS functionality
 * @param email - User email address
 * @returns true if user can access CMS, false otherwise
 */
export async function canAccessCMS(email: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Super admin can always access
  if (user.role === 'super_admin') return true;

  // Check if user has cms_admin business role
  return await hasCMSAdminRole(email);
}

/**
 * Gets CMS access level for user
 * @param email - User email address
 * @returns CMS access level: 'none', 'cms_admin', or 'super_admin'
 */
export async function getCMSAccessLevel(email: string): Promise<'none' | 'cms_admin' | 'super_admin'> {
  const user = await getCurrentUser();
  if (!user) return 'none';

  if (user.role === 'super_admin') return 'super_admin';
  
  const hasCMS = await hasCMSAdminRole(email);
  return hasCMS ? 'cms_admin' : 'none';
}

/**
 * Validates CMS API access for server-side operations
 * @param email - User email address
 * @param requiredPermission - Required CMS permission
 * @returns true if access is granted, false otherwise
 */
export async function validateCMSAccess(
  email: string,
  requiredPermission: CMSPermission
): Promise<boolean> {
  if (!email) return false;
  
  return await hasCMSPermission(email, requiredPermission);
}

/**
 * Gets CMS user info for debugging
 * @param email - User email address
 * @returns CMS user information
 */
export async function getCMSUserInfo(email: string): Promise<{
  hasAccess: boolean;
  accessLevel: 'none' | 'cms_admin' | 'super_admin';
  permissions: CMSPermission[];
  businessRoles: string[];
}> {
  const hasAccess = await canAccessCMS(email);
  const accessLevel = await getCMSAccessLevel(email);
  const permissions = await getCMSPermissions(email);
  const businessRoles = await getBusinessRoles(email);

  return {
    hasAccess,
    accessLevel,
    permissions,
    businessRoles
  };
}
