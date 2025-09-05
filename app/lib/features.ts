/**
 * Feature flags for YEC Registration
 * Controls the availability of new features
 */

/**
 * Check if a feature is enabled
 * @param feature - Feature name to check
 * @returns true if feature is enabled, false otherwise
 */
export function isFeatureEnabled(feature: string): boolean {
  const envValue = process.env[`FEATURES_${feature.toUpperCase()}`];
  return envValue === "true";
}

/**
 * Feature flags
 */
export const FEATURES = {
  ADMIN_JOB_ASSIGNMENT: "ADMIN_JOB_ASSIGNMENT",
  GRANULAR_RBAC: "GRANULAR_RBAC",
  ADMIN_MANAGEMENT: "ADMIN_MANAGEMENT",
} as const;

/**
 * Check if admin job assignment feature is enabled
 */
export function isAdminJobAssignmentEnabled(): boolean {
  return isFeatureEnabled(FEATURES.ADMIN_JOB_ASSIGNMENT);
}

/**
 * Check if granular RBAC feature is enabled
 */
export function isGranularRBACEnabled(): boolean {
  return isFeatureEnabled(FEATURES.GRANULAR_RBAC);
}

/**
 * Check if admin management feature is enabled
 */
export function isAdminManagementEnabled(): boolean {
  return isFeatureEnabled(FEATURES.ADMIN_MANAGEMENT);
}
