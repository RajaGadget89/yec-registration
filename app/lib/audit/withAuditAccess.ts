import { NextRequest, NextResponse } from "next/server";
import { logAccess } from "./auditClient";
import { randomUUID } from "crypto";
import { createRequestContext, withRequestContext } from "./requestContext";

// Set runtime to Node
export const runtime = "nodejs";

// Debug: Verify this module is loaded (only in test environment)
if (process.env.PLAYWRIGHT_TEST === "1") {
  console.debug("[AUDIT_WRAPPER] Module loaded successfully");
}

/**
 * Configuration for audit logging
 */
export interface AuditConfig {
  skipLogging?: boolean;
  action?: string;
  resource?: string;
}

/**
 * Extract request ID from headers or generate new one
 */
function extractRequestId(request: NextRequest): string {
  return (
    request.headers.get("x-request-id") ||
    request.headers.get("x-correlation-id") ||
    randomUUID()
  );
}

/**
 * Extract user agent from request headers
 */
function extractUserAgent(request: NextRequest): string | undefined {
  return request.headers.get("user-agent") || undefined;
}

/**
 * Extract client IP from request headers
 */
function extractClientIP(request: NextRequest): string | undefined {
  // Prefer x-forwarded-for (first item)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  // Fall back to x-real-ip
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  return undefined;
}

/**
 * Format action string from method and path
 */
function formatAction(method: string, path: string): string {
  return `api:${method} ${path}`;
}

/**
 * Format resource string from path
 */
function formatResource(path: string): string {
  if (path.startsWith("/api/register")) {
    return "registration";
  }
  if (path.startsWith("/api/auth")) {
    return "auth";
  }
  if (path.startsWith("/api/admin")) {
    return "admin";
  }
  return "api";
}

/**
 * Wrapper for API route handlers that logs access events
 */
export function withAuditLogging<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  config: AuditConfig = {},
) {
  if (process.env.PLAYWRIGHT_TEST === "1") {
    console.debug("[AUDIT_WRAPPER] withAuditLogging function called");
  }

  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    if (process.env.PLAYWRIGHT_TEST === "1") {
      console.debug("[AUDIT_WRAPPER] Wrapped handler called");
    }
    const startTime = Date.now();
    let response: NextResponse;
    let statusCode = 500; // Default to 500 in case of unhandled errors

    try {
      // Skip logging if configured
      if (config.skipLogging) {
        return await handler(request, ...args);
      }

      // Extract request information
      const requestId = extractRequestId(request);
      const clientIP = extractClientIP(request);
      const userAgent = extractUserAgent(request);
      const method = request.method;
      const path = request.nextUrl.pathname;

      // Debug logging for test environment
      if (process.env.PLAYWRIGHT_TEST === "1") {
        console.debug(
          `[AUDIT_WRAPPER] Processing request: ${method} ${path} -> ${requestId}`,
        );
      }

      // Format action and resource
      const action = config.action || formatAction(method, path);
      const resource = config.resource || formatResource(path);

      // Create request context for correlation
      const requestContext = createRequestContext(request);

      // Execute the handler with request context
      response = await withRequestContext(requestContext, async () => {
        return await handler(request, ...args);
      });
      statusCode = response.status;

      // Debug logging for test environment
      if (process.env.PLAYWRIGHT_TEST === "1") {
        console.debug(
          `[AUDIT_WRAPPER] Request ${requestId} completed with status ${statusCode}`,
        );
      }

      // Log access event (fire-and-forget)
      logAccess({
        action,
        method,
        resource,
        result: statusCode.toString(),
        request_id: requestId,
        src_ip: clientIP,
        user_agent: userAgent,
        latency_ms: Date.now() - startTime,
        meta: {
          wrapper_version: "1.0.0",
          timestamp: new Date().toISOString(),
        },
      });

      // Add request ID to response headers for correlation
      response.headers.set("x-request-id", requestId);

      return response;
    } catch (error) {
      // Handle unhandled errors
      statusCode = 500;
      response = NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );

      // Log the error (fire-and-forget)
      if (!config.skipLogging) {
        const requestId = extractRequestId(request);
        const clientIP = extractClientIP(request);
        const userAgent = extractUserAgent(request);
        const method = request.method;
        const path = request.nextUrl.pathname;

        const action = config.action || formatAction(method, path);
        const resource = config.resource || formatResource(path);

        logAccess({
          action,
          method,
          resource,
          result: statusCode.toString(),
          request_id: requestId,
          src_ip: clientIP,
          user_agent: userAgent,
          latency_ms: Date.now() - startTime,
          meta: {
            wrapper_version: "1.0.0",
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
          },
        });

        response.headers.set("x-request-id", requestId);
      }

      return response;
    }
  };
}
