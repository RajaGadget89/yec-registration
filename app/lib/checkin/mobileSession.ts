/**
 * Mobile session management utilities for checker admins
 */

export interface MobileSession {
  user: {
    id: string;
    email: string;
    role: string;
    is_active: boolean;
  };
  expires_at: string;
  created_at: string;
}

/**
 * Check if mobile session is valid
 */
export function isMobileSessionValid(session: MobileSession | null): boolean {
  if (!session) return false;

  const now = new Date();
  const expiresAt = new Date(session.expires_at);

  return now < expiresAt && session.user.is_active;
}

/**
 * Get mobile session from localStorage
 */
export function getMobileSession(): MobileSession | null {
  if (typeof window === "undefined") return null;

  try {
    const sessionData = localStorage.getItem("mobile_session");
    if (!sessionData) return null;

    const session = JSON.parse(sessionData);
    return isMobileSessionValid(session) ? session : null;
  } catch (error) {
    console.error("Error getting mobile session:", error);
    return null;
  }
}

/**
 * Set mobile session in localStorage
 */
export function setMobileSession(session: MobileSession): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem("mobile_session", JSON.stringify(session));
  } catch (error) {
    console.error("Error setting mobile session:", error);
  }
}

/**
 * Clear mobile session from localStorage
 */
export function clearMobileSession(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem("mobile_session");
  } catch (error) {
    console.error("Error clearing mobile session:", error);
  }
}

/**
 * Refresh mobile session
 */
export async function refreshMobileSession(): Promise<MobileSession | null> {
  try {
    const response = await fetch("/api/checker/me");
    if (!response.ok) return null;

    const data = await response.json();
    const session: MobileSession = {
      user: {
        id: data.id,
        email: data.email,
        role: "checker_admin", // Default role for checker admins
        is_active: true,
      },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      created_at: new Date().toISOString(),
    };

    setMobileSession(session);
    return session;
  } catch (error) {
    console.error("Error refreshing mobile session:", error);
    return null;
  }
}

/**
 * Check connection status
 */
export async function checkConnectionStatus(): Promise<{
  internet: boolean;
  database: boolean;
  timestamp: string;
}> {
  const timestamp = new Date().toISOString();

  try {
    // Check internet connection
    const internetResponse = await fetch("/api/health", {
      method: "GET",
      cache: "no-cache",
    });
    const internet = internetResponse.ok;

    // Check database connection - only if user is authenticated
    let database = false;
    try {
      const dbResponse = await fetch("/api/checker/me", {
        method: "GET",
        cache: "no-cache",
      });
      database = dbResponse.ok;
    } catch (dbError) {
      // Database check failed, but don't treat as error if user isn't authenticated
      console.log(
        "Database connection check failed (user may not be authenticated):",
        dbError,
      );
      database = false;
    }

    return {
      internet,
      database,
      timestamp,
    };
  } catch (error) {
    console.error("Error checking connection status:", error);
    return {
      internet: false,
      database: false,
      timestamp,
    };
  }
}

/**
 * Start connection monitoring
 */
export function startConnectionMonitoring(
  onStatusChange: (status: {
    internet: boolean;
    database: boolean;
    timestamp: string;
  }) => void,
  intervalMs: number = 3 * 60 * 1000, // 3 minutes
): () => void {
  const intervalId: NodeJS.Timeout = setInterval(() => {}, 0);

  const checkConnection = async () => {
    const status = await checkConnectionStatus();
    onStatusChange(status);
  };

  // Initial check
  checkConnection();

  // Set up interval
  clearInterval(intervalId);
  const id: NodeJS.Timeout = setInterval(checkConnection, intervalMs);

  // Return cleanup function
  return () => {
    if (id) {
      clearInterval(id);
    }
  };
}
