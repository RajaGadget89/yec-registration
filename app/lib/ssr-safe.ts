/**
 * SSR-safe utilities to prevent hydration mismatches
 * These utilities ensure consistent behavior between server and client rendering
 */

/**
 * Check if code is running in browser environment
 */
export const isBrowser = (): boolean => typeof window !== 'undefined';

/**
 * SSR-safe date creation
 * Returns a consistent date on server and client during initial render
 */
export const ssrSafeDate = (d?: string | number | Date): Date => {
  if (isBrowser()) {
    return new Date(d ?? Date.now());
  }
  // On server, return epoch to ensure consistency
  return new Date(0);
};

/**
 * SSR-safe random number generation
 * Returns consistent value on server, random on client
 */
export const ssrSafeRandom = (): number => {
  if (isBrowser() && typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    return Number(crypto.getRandomValues(new Uint32Array(1))[0]) / 2**32;
  }
  // On server, return fixed value to prevent hydration mismatch
  return 0.5;
};

/**
 * SSR-safe idempotency key generation
 * Uses timestamp + random for uniqueness while being SSR-safe
 */
export const ssrSafeIdempotencyKey = (prefix: string): string => {
  const timestamp = Date.now();
  const random = ssrSafeRandom();
  const randomStr = random.toString(36).substr(2, 9);
  return `${prefix}_${timestamp}_${randomStr}`;
};

/**
 * SSR-safe media query check
 * Returns false on server, actual value on client
 */
export const ssrSafeMediaQuery = (query: string): boolean => {
  if (!isBrowser()) {
    return false;
  }
  return window.matchMedia(query).matches;
};

/**
 * SSR-safe clipboard access
 * Returns false on server, actual capability on client
 */
export const ssrSafeClipboardAvailable = (): boolean => {
  if (!isBrowser()) {
    return false;
  }
  return 'clipboard' in navigator && 'writeText' in navigator.clipboard;
};

/**
 * SSR-safe document operations
 * Returns no-op functions on server
 */
export const ssrSafeDocument = {
  createElement: (tagName: string): HTMLElement | null => {
    if (!isBrowser()) {
      return null;
    }
    return document.createElement(tagName);
  },
  
  execCommand: (command: string): boolean => {
    if (!isBrowser()) {
      return false;
    }
    return document.execCommand(command);
  },
  
  body: {
    appendChild: (node: Node): Node | null => {
      if (!isBrowser()) {
        return null;
      }
      return document.body.appendChild(node);
    },
    
    removeChild: (node: Node): Node | null => {
      if (!isBrowser()) {
        return null;
      }
      return document.body.removeChild(node);
    }
  }
};

/**
 * SSR-safe window operations
 */
export const ssrSafeWindow = {
  location: {
    href: (): string => {
      if (!isBrowser()) {
        return '';
      }
      return window.location.href;
    },
    
    reload: (): void => {
      if (isBrowser()) {
        window.location.reload();
      }
    }
  }
};
