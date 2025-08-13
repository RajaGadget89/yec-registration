import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

/**
 * Request context interface
 */
export interface RequestContext {
  requestId: string;
}

/**
 * Async local storage for request context
 */
const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request context
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * Get the current request ID
 */
export function getRequestId(): string {
  const context = getRequestContext();
  return context?.requestId || randomUUID();
}

/**
 * Run a function with request context
 */
export function withRequestContext<T>(
  context: RequestContext,
  fn: () => Promise<T>
): Promise<T> {
  return requestContextStorage.run(context, fn);
}

/**
 * Create request context from NextRequest
 */
export function createRequestContext(request: any): RequestContext {
  // Extract request ID from headers or generate new one
  const requestId = request.headers.get('x-request-id') || 
                   request.headers.get('x-correlation-id') || 
                   randomUUID();
  
  return {
    requestId
  };
}

