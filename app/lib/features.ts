/**
 * Feature flags system for controlling feature availability
 * Features can be enabled/disabled based on environment and configuration
 * 
 * DEFAULT BEHAVIOR:
 * - TEST_HELPERS_ENABLED: OFF by default (must be explicitly set to '1')
 * - FEATURES_ADMIN_MANAGEMENT: OFF in production, ON in development/staging by default
 */

export interface FeatureFlags {
  adminManagement: boolean;
}

/**
 * Get feature flags based on environment
 * Default: ON in staging, OFF in production
 */
export function getFeatureFlags(): FeatureFlags {
  const env = process.env.NODE_ENV || "development";
  const adminManagementFlag = process.env.FEATURES_ADMIN_MANAGEMENT;

  // Explicit flag override
  if (adminManagementFlag !== undefined) {
    return {
      adminManagement: adminManagementFlag === "true" || adminManagementFlag === "1",
    };
  }

  // Environment-based defaults
  if (env === "production") {
    return {
      adminManagement: false, // OFF in production by default
    };
  }

  // Development and staging defaults
  return {
    adminManagement: true, // ON in development/staging by default
  };
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature];
}

/**
 * Get feature flags for client-side use (safe to expose)
 */
export function getClientFeatureFlags(): Partial<FeatureFlags> {
  const flags = getFeatureFlags();
  
  // Only expose features that are safe for client-side
  return {
    adminManagement: flags.adminManagement,
  };
}

