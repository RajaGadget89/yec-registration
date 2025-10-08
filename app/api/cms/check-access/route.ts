/**
 * CMS Access Check API Endpoint
 * Checks if current user has access to CMS functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { canAccessCMS, getCMSAccessLevel, getCMSPermissions } from '../../../lib/cms-auth';
import { getCurrentUser } from '../../../lib/auth-utils.server';

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { 
          hasAccess: false, 
          accessLevel: 'none',
          permissions: [],
          message: 'Authentication required' 
        },
        { status: 401 }
      );
    }

    // Check CMS access
    const hasAccess = await canAccessCMS(user.email);
    const accessLevel = await getCMSAccessLevel(user.email);
    const permissions = await getCMSPermissions(user.email);

    return NextResponse.json({
      hasAccess,
      accessLevel,
      permissions,
      user: {
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('CMS access check error:', error);
    return NextResponse.json(
      { 
        hasAccess: false, 
        accessLevel: 'none',
        permissions: [],
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
