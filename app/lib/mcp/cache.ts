const enable = process.env.MCP_ENABLE_CACHE === "true";

const store = new Map<string, { value: any; expiresAt: number }>();

export function getCache<T>(key: string): T | null {
  if (!enable) return null;
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCache<T>(key: string, value: T, ttlMs: number): void {
  if (!enable) return;
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function delCache(key: string): void {
  store.delete(key);
}
