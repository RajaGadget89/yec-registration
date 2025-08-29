import {
  logAccess as rawLogAccess,
  logEvent as rawLogEvent,
} from "./auditClient";

type AccessParams = Parameters<typeof rawLogAccess>[0];
type EventParams = Parameters<typeof rawLogEvent>[0];

function isSoftMode(): boolean {
  const mode = process.env.AUDIT_MODE || "strict";
  if (mode === "soft") return true;
  // Allow E2E switch to force soft behavior without changing prod defaults
  if (process.env.E2E_TESTS === "true") return true;
  return false;
}

/**
 * Safe, non-throwing audit access logger. In soft mode, all errors are swallowed.
 * In strict mode, we currently still swallow errors to preserve product behavior.
 * This wrapper exists to centralize the soft-fail contract for tests.
 */
export async function safeLogAccess(p: AccessParams): Promise<void> {
  try {
    await rawLogAccess(p);
  } catch (error) {
    if (isSoftMode()) {
      console.warn("[audit-soft] logAccess suppressed error:", error);
      return;
    }
    // Preserve current behavior: do not throw in strict either
    console.error("[audit] logAccess error:", error);
  }
}

/**
 * Safe, non-throwing audit event logger. Mirrors safeLogAccess behavior.
 */
export async function safeLogEvent(p: EventParams): Promise<void> {
  try {
    await rawLogEvent(p);
  } catch (error) {
    if (isSoftMode()) {
      console.warn("[audit-soft] logEvent suppressed error:", error);
      return;
    }
    console.error("[audit] logEvent error:", error);
  }
}
