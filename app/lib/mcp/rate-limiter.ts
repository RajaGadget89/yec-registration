type BucketKey = string;

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<BucketKey, Bucket>();

const WINDOW_MS = Number(process.env.MCP_RATE_LIMIT_WINDOW_MS || 60000);
const MAX_REQUESTS = Number(process.env.MCP_RATE_LIMIT_MAX_REQUESTS || 1000);
const BURST = Number(process.env.MCP_RATE_LIMIT_BURST || 150);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
}

export function rateLimit(key: BucketKey): RateLimitResult {
  const now = Date.now();
  const refillRate = MAX_REQUESTS / WINDOW_MS; // tokens per ms
  const bucket = buckets.get(key) || {
    tokens: MAX_REQUESTS + BURST,
    lastRefill: now,
  };

  // Refill
  const elapsed = now - bucket.lastRefill;
  bucket.tokens = Math.min(
    MAX_REQUESTS + BURST,
    bucket.tokens + elapsed * refillRate,
  );
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      reset: now + WINDOW_MS,
    };
  }

  buckets.set(key, bucket);
  return { allowed: false, remaining: 0, reset: now + WINDOW_MS };
}
