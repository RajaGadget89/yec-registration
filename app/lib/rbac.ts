/**
 * RBAC (Role-Based Access Control) utility for YEC Registration
 * Implements staging-ready RBAC using environment-based allowlists
 *
 * This is the SINGLE SOURCE OF TRUTH for role determination.
 * All server-side RBAC checks should use this utility.
 */

export type Role =
  | "super_admin"
  | "admin_payment"
  | "admin_profile"
  | "admin_tcc";

export type Dimension = "payment" | "profile" | "tcc";

/**
 * Normalizes email for consistent comparison
 * @param email - Email address to normalize
 * @returns Normalized email (lowercase, trimmed)
 */
export function normalizeEmail(email: string): string {
  return email?.trim().toLowerCase() || "";
}

/**
 * Parses email allowlist from environment variable
 * @param envVar - Environment variable name
 * @returns Set of normalized email addresses
 */
function parseEmailAllowlist(envVar: string): Set<string> {
  const emails = process.env[envVar]?.split(",") || [];
  return new Set(emails.map((e) => normalizeEmail(e)).filter(Boolean));
}

// Parse allowlists once at module load
const SUPER_ADMIN_EMAILS = parseEmailAllowlist("ADMIN_SUPER_EMAILS");
const PAYMENT_ADMIN_EMAILS = parseEmailAllowlist("ADMIN_PAYMENT_EMAILS");
const PROFILE_ADMIN_EMAILS = parseEmailAllowlist("ADMIN_PROFILE_EMAILS");
const TCC_ADMIN_EMAILS = parseEmailAllowlist("ADMIN_TCC_EMAILS");

/**
 * Gets all roles for a given user email
 * @param email - User email address (case-insensitive)
 * @returns Set of roles assigned to the user
 */
export function getRolesForEmail(email: string): Set<Role> {
  if (!email) return new Set();

  const emailNormalized = normalizeEmail(email);
  const roles = new Set<Role>();

  if (SUPER_ADMIN_EMAILS.has(emailNormalized)) {
    roles.add("super_admin");
  }
  if (PAYMENT_ADMIN_EMAILS.has(emailNormalized)) {
    roles.add("admin_payment");
  }
  if (PROFILE_ADMIN_EMAILS.has(emailNormalized)) {
    roles.add("admin_profile");
  }
  if (TCC_ADMIN_EMAILS.has(emailNormalized)) {
    roles.add("admin_tcc");
  }

  return roles;
}

/**
 * Checks if a user can review a specific dimension
 * @param email - User email address
 * @param dimension - Dimension to check access for
 * @returns true if user can review the dimension, false otherwise
 */
export function canReviewDimension(
  email: string,
  dimension: Dimension,
): boolean {
  if (!email) return false;

  const roles = getRolesForEmail(email);

  // Super admin can review all dimensions
  if (roles.has("super_admin")) {
    return true;
  }

  // Check dimension-specific roles
  switch (dimension) {
    case "payment":
      return roles.has("admin_payment");
    case "profile":
      return roles.has("admin_profile");
    case "tcc":
      return roles.has("admin_tcc");
    default:
      return false;
  }
}

/**
 * Checks if a user can approve registrations
 * @param email - User email address
 * @returns true if user can approve, false otherwise
 */
export function canApprove(email: string): boolean {
  if (!email) return false;

  const roles = getRolesForEmail(email);

  // Only super admin can approve
  return roles.has("super_admin");
}

/**
 * Gets all users with a specific role (for debugging/logging)
 * @param role - Role to get users for
 * @returns Array of email addresses with the role
 */
export function getUsersWithRole(role: Role): string[] {
  switch (role) {
    case "super_admin":
      return Array.from(SUPER_ADMIN_EMAILS);
    case "admin_payment":
      return Array.from(PAYMENT_ADMIN_EMAILS);
    case "admin_profile":
      return Array.from(PROFILE_ADMIN_EMAILS);
    case "admin_tcc":
      return Array.from(TCC_ADMIN_EMAILS);
    default:
      return [];
  }
}

/**
 * Gets all configured roles and their user counts (for debugging/logging)
 * @returns Object with role counts
 */
export function getRoleStats(): Record<Role, number> {
  return {
    super_admin: SUPER_ADMIN_EMAILS.size,
    admin_payment: PAYMENT_ADMIN_EMAILS.size,
    admin_profile: PROFILE_ADMIN_EMAILS.size,
    admin_tcc: TCC_ADMIN_EMAILS.size,
  };
}

/**
 * Validates that the RBAC configuration is properly set up
 * @returns true if configuration is valid, false otherwise
 */
export function validateRBACConfig(): boolean {
  const stats = getRoleStats();
  const totalUsers = Object.values(stats).reduce(
    (sum, count) => sum + count,
    0,
  );

  // At least one super admin should be configured
  if (stats.super_admin === 0) {
    console.warn("[RBAC] No super admin users configured");
    return false;
  }

  // At least one user should be configured
  if (totalUsers === 0) {
    console.warn("[RBAC] No admin users configured");
    return false;
  }

  return true;
}

/**
 * Gets a short build identifier for debugging
 * @returns Short build ID string
 */
export function getEnvBuildId(): string {
  // Try to get from environment variable first
  if (process.env.BUILD_ID) {
    return process.env.BUILD_ID.substring(0, 8);
  }

  // Fallback to timestamp-based ID
  const timestamp = Date.now().toString(36);
  return timestamp.substring(timestamp.length - 6);
}

/**
 * Logs RBAC information for debugging (no PII beyond email)
 * @param email - User email
 * @param roles - User roles
 */
export function logRBACInfo(email: string, roles: Set<Role>): void {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.DEV_ADMIN_DEBUG === "true"
  ) {
    console.log(
      `[RBAC] email=${normalizeEmail(email)}, roles=[${Array.from(roles).join(", ")}]`,
    );
  }
}

/**
 * Logs RBAC configuration for debugging (development only)
 */
export function logRBACConfig(): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const stats = getRoleStats();
  console.log("[RBAC] Configuration loaded:");
  console.log(`  Super Admin: ${stats.super_admin} users`);
  console.log(`  Payment Admin: ${stats.admin_payment} users`);
  console.log(`  Profile Admin: ${stats.admin_profile} users`);
  console.log(`  TCC Admin: ${stats.admin_tcc} users`);

  // Log specific users for each role
  Object.entries(stats).forEach(([role, count]) => {
    if (count > 0) {
      const users = getUsersWithRole(role as Role);
      console.log(`  ${role}: ${users.join(", ")}`);
    }
  });
}

// Log configuration on module load (development only)
logRBACConfig();
