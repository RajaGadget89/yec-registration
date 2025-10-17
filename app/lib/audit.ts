/**
 * Audit utilities for logging access and events
 * Re-exports from auditClient for easier imports
 */

export { logAccess, logEvent } from "./audit/auditClient";

// Create a default audit object for convenience
import { logAccess, logEvent } from "./audit/auditClient";

export const audit = {
  logAccess,
  logEvent,
};
