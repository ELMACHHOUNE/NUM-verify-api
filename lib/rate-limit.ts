import "server-only";

import { getRateLimitKey } from "@/lib/get-client-ip";

/**
 * Minimal fixed-window rate limiter.
 *
 * In-memory by design: it protects a single instance from runaway clients. For
 * multi-instance deployments, move this to a shared store (Redis, Upstash, ...)
 * and/or enable rate limiting at the hosting platform.
 */

export { getRateLimitKey };

/** Lookup endpoint: generous, because each hit costs an upstream API call. */
export const LOOKUP_LIMIT = { windowMs: 60_000, max: 20 } as const;

/** Tracking endpoint: browsers legitimately fire a handful of page views a minute. */
export const TRACK_LIMIT = { windowMs: 60_000, max: 60 } as const;

/** Sign-in endpoint: strict, and on a long window, to slow credential stuffing. */
export const LOGIN_LIMIT = { windowMs: 15 * 60_000, max: 10 } as const;

/**
 * Sign-ups are cheaper to abuse than sign-ins and each one writes a document,
 * so the window is tighter: 5 accounts per hour per IP.
 */
export const REGISTER_LIMIT = { windowMs: 60 * 60_000, max: 5 } as const;

export interface RateLimitRule {
  windowMs: number;
  max: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const MAX_TRACKED_CLIENTS = 10_000;

function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Guard against unbounded growth when keys churn faster than they expire.
  if (buckets.size >= MAX_TRACKED_CLIENTS) buckets.clear();
}

/** Best-effort client identity from proxy headers. */
export function getClientKey(request: Request): string {
  return getRateLimitKey(request.headers);
}

export interface RateLimitResult {
  limited: boolean;
  retryAfterSeconds: number;
}

/**
 * Consumes one slot for `key` under `rule`.
 *
 * @param rule Window length and maximum number of requests inside it.
 */
export function checkRateLimitWithRule(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucketKey = `${rule.windowMs}:${rule.max}:${key}`;
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + rule.windowMs });
    return { limited: false, retryAfterSeconds: 0 };
  }

  bucket.count += 1;

  if (bucket.count > rule.max) {
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  return { limited: false, retryAfterSeconds: 0 };
}

/** Default 20-requests-per-minute budget used by the phone lookup route. */
export function checkRateLimit(key: string): RateLimitResult {
  return checkRateLimitWithRule(key, LOOKUP_LIMIT);
}
