const tokenRateLimitBuckets = new Map<string, number[]>();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 100;

export function checkV1RateLimit(tokenHash: string): boolean {
  const now = Date.now();
  const bucket = tokenRateLimitBuckets.get(tokenHash) ?? [];

  const recentRequests = bucket.filter((timestamp) => now - timestamp < WINDOW_MS);

  if (recentRequests.length >= MAX_REQUESTS) {
    tokenRateLimitBuckets.set(tokenHash, recentRequests);
    return false;
  }

  recentRequests.push(now);
  tokenRateLimitBuckets.set(tokenHash, recentRequests);
  return true;
}
