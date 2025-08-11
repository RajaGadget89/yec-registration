/**
 * Event tracing and debugging utilities
 * Development-only features for debugging authentication issues
 */

export const AUTH_TRACE = process.env.AUTH_TRACE === '1';
export const AUTH_NO_EVENTS = process.env.AUTH_NO_EVENTS === '1';

/**
 * Helper to determine if events should be skipped for a given request path
 */
export function shouldSkipEvents(req: Request): boolean {
  if (!AUTH_NO_EVENTS) return false;
  
  const url = new URL(req.url);
  const path = url.pathname;
  
  // Skip events for auth-related paths
  if (/^\/(auth|api\/auth|api\/_diag)\//.test(path)) {
    console.log(`[auth-debug] skipping events for ${path}`);
    return true;
  }
  
  return false;
}

/**
 * Get caller information from stack trace
 */
export function getCallerInfo(): string {
  try {
    const stack = new Error().stack;
    if (!stack) return 'unknown';
    
    const lines = stack.split('\n');
    // Skip first 2 lines (Error constructor and this function)
    const callerLine = lines[3];
    if (!callerLine) return 'unknown';
    
    // Extract file path and line number
    const match = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
    if (match) {
      const [, , filePath, line] = match;
      const fileName = filePath.split('/').pop() || filePath;
      return `${fileName}:${line}`;
    }
    
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Mask sensitive data for logging
 */
export function maskToken(token: string): string {
  if (!token || token.length < 8) return 'null';
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
}
