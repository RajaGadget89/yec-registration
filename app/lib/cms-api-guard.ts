/**
 * CMS API Guard - Middleware for protecting CMS API endpoints
 * Ensures only authorized users can access CMS functionality
 */

import { NextRequest, NextResponse } from "next/server";
import { canAccessCMS, hasCMSPermission, CMSPermission } from "./cms-auth";
import { getCurrentUser } from "./auth-utils.server";

/**
 * CMS API Guard middleware
 * @param request - Next.js request object
 * @param requiredPermission - Required CMS permission
 * @returns NextResponse or null (if access granted)
 */
export async function withCMSApiGuard(
  request: NextRequest,
  requiredPermission: CMSPermission,
): Promise<NextResponse | null> {
  try {
    // Development bypass for easier testing
    if (
      process.env.NODE_ENV === "development" &&
      process.env.DEV_ADMIN_BYPASS === "true"
    ) {
      console.log(
        "[CMS_API_GUARD] DEV_ADMIN_BYPASS enabled - allowing CMS access",
      );
      return null; // Allow access
    }

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Check CMS access
    const hasAccess = await canAccessCMS(user.email);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "CMS access denied. Required role: cms_admin or super_admin" },
        { status: 403 },
      );
    }

    // Check specific permission
    const hasPermission = await hasCMSPermission(
      user.email,
      requiredPermission,
    );
    if (!hasPermission) {
      return NextResponse.json(
        { error: `Permission denied. Required: ${requiredPermission}` },
        { status: 403 },
      );
    }

    // Access granted, return null to continue
    return null;
  } catch (error) {
    console.error("CMS API Guard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * CMS API Guard for content management operations
 * @param request - Next.js request object
 * @returns NextResponse or null (if access granted)
 */
export async function withContentManagementGuard(
  request: NextRequest,
): Promise<NextResponse | null> {
  return await withCMSApiGuard(request, "content_manage");
}

/**
 * CMS API Guard for media upload operations
 * @param request - Next.js request object
 * @returns NextResponse or null (if access granted)
 */
export async function withMediaUploadGuard(
  request: NextRequest,
): Promise<NextResponse | null> {
  return await withCMSApiGuard(request, "media_upload");
}

/**
 * CMS API Guard for branding management operations
 * @param request - Next.js request object
 * @returns NextResponse or null (if access granted)
 */
export async function withBrandingManagementGuard(
  request: NextRequest,
): Promise<NextResponse | null> {
  return await withCMSApiGuard(request, "branding_manage");
}

/**
 * CMS API Guard for content publishing operations
 * @param request - Next.js request object
 * @returns NextResponse or null (if access granted)
 */
export async function withContentPublishGuard(
  request: NextRequest,
): Promise<NextResponse | null> {
  return await withCMSApiGuard(request, "content_publish");
}

/**
 * CMS API Guard for news management operations
 * @param request - Next.js request object
 * @returns NextResponse or null (if access granted)
 */
export async function withNewsManagementGuard(
  request: NextRequest,
): Promise<NextResponse | null> {
  return await withCMSApiGuard(request, "news_manage");
}

/**
 * CMS API Guard for template management operations
 * @param request - Next.js request object
 * @returns NextResponse or null (if access granted)
 */
export async function withTemplateManagementGuard(
  request: NextRequest,
): Promise<NextResponse | null> {
  return await withCMSApiGuard(request, "templates_manage");
}

/**
 * CMS API Guard for SEO optimization operations
 * @param request - Next.js request object
 * @returns NextResponse or null (if access granted)
 */
export async function withSEOOptimizationGuard(
  request: NextRequest,
): Promise<NextResponse | null> {
  return await withCMSApiGuard(request, "seo_optimize");
}

/**
 * Generic CMS API Guard with custom permission
 * @param request - Next.js request object
 * @param permission - Required CMS permission
 * @returns NextResponse or null (if access granted)
 */
export async function withCustomCMSGuard(
  request: NextRequest,
  permission: CMSPermission,
): Promise<NextResponse | null> {
  return await withCMSApiGuard(request, permission);
}
