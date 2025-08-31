/**
 * Feature Flag Utilities for E2E Tests
 * Provides utilities for testing feature flag functionality
 */

export interface TestFeatureFlags {
  adminManagement: boolean;
}

/**
 * Get current feature flag state from environment
 */
export function getCurrentFeatureFlags(): TestFeatureFlags {
  const adminManagement = process.env.FEATURES_ADMIN_MANAGEMENT === 'true';
  
  return {
    adminManagement,
  };
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof TestFeatureFlags): boolean {
  const flags = getCurrentFeatureFlags();
  return flags[feature];
}

/**
 * Check if Admin Management feature is enabled
 */
export function isAdminManagementEnabled(): boolean {
  return isFeatureEnabled('adminManagement');
}

/**
 * Get feature flag status for logging/debugging
 */
export function getFeatureFlagStatus(): string {
  const flags = getCurrentFeatureFlags();
  return `FEATURES_ADMIN_MANAGEMENT=${flags.adminManagement ? 'true' : 'false'}`;
}

/**
 * Validate feature flag configuration for tests
 */
export function validateFeatureFlagConfig(): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check if FEATURES_ADMIN_MANAGEMENT is set
  if (process.env.FEATURES_ADMIN_MANAGEMENT === undefined) {
    issues.push('FEATURES_ADMIN_MANAGEMENT environment variable is not set');
  }
  
  // Check if the value is valid
  const adminManagement = process.env.FEATURES_ADMIN_MANAGEMENT;
  if (adminManagement !== undefined && adminManagement !== 'true' && adminManagement !== 'false') {
    issues.push(`FEATURES_ADMIN_MANAGEMENT has invalid value: ${adminManagement} (expected 'true' or 'false')`);
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}
