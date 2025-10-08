/**
 * CMS Access Control API - CMS Permission Management
 * Handles CMS access control and permission checking
 */

import { NextRequest, NextResponse } from 'next/server';
import { withContentManagementGuard } from '../../../../lib/cms-api-guard';
import { getCurrentUserFromRequest } from '../../../../lib/auth-utils.server';
import { getCMSUserInfo, getCMSPermissions, getCMSAccessLevel } from '../../../../lib/cms-auth';

/**
 * GET /api/admin/cms/access-control
 * Get current user's CMS access information
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const guardResponse = await withContentManagementGuard(request);
    if (guardResponse) return guardResponse;

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get comprehensive CMS user info
    const cmsUserInfo = await getCMSUserInfo(user.email);
    const permissions = await getCMSPermissions(user.email);
    const accessLevel = await getCMSAccessLevel(user.email);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      cms: {
        hasAccess: cmsUserInfo.hasAccess,
        accessLevel: cmsUserInfo.accessLevel,
        permissions: cmsUserInfo.permissions,
        businessRoles: cmsUserInfo.businessRoles
      },
      permissions,
      accessLevel
    });

  } catch (error) {
    console.error('CMS Access Control GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
