import type { Registration } from "../types/database";

/**
 * Check if a registration is in a terminal state (rejected or approved)
 * Terminal states should be read-only with no dimension actions available
 */
export function isTerminalState(registration: Registration | null): boolean {
  if (!registration) return false;
  return (
    registration.status === "rejected" || registration.status === "approved"
  );
}

/**
 * Get the appropriate tooltip message for terminal state actions
 */
export function getTerminalStateTooltip(
  registration: Registration | null,
): string {
  if (!registration) return "Registration not found";

  if (registration.status === "rejected") {
    return "Locked: registration is rejected (terminal state)";
  }

  if (registration.status === "approved") {
    return "Locked: registration is approved (terminal state)";
  }

  return "";
}

/**
 * Check if dimension actions should be disabled for a registration
 * Combines terminal state check with existing RBAC logic
 */
export function shouldDisableDimensionActions(
  registration: Registration | null,
  canReviewDimension: boolean,
): boolean {
  if (!registration || !canReviewDimension) return true;
  return isTerminalState(registration);
}

/**
 * Check if main approve/reject actions should be disabled for a registration
 * Combines terminal state check with existing RBAC logic
 */
export function shouldDisableMainActions(
  registration: Registration | null,
  canApprove: boolean,
): boolean {
  if (!registration || !canApprove) return true;
  return isTerminalState(registration);
}
