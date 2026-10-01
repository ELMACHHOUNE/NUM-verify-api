import { NextResponse } from "next/server";

import { upsertVisitor } from "@/lib/analytics";
import { getClientIp, isNonRoutableIp } from "@/lib/get-client-ip";
import { IpstackError, lookupIp } from "@/lib/ipstack";
import { DatabaseError, isDatabaseConfigured } from "@/lib/mongodb";
import { checkRateLimitWithRule, getClientKey, TRACK_LIMIT } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { parseUserAgent } from "@/lib/user-agent";
import { TRACK_ERROR_MESSAGES, trackPageSchema } from "@/lib/validations";
import type { TrackErrorResponse } from "@/types/analytics";
import type { IpGeolocation } from "@/types/ipstack";

/**
 * Public page-view tracking.
 *
 * The browser sends only `{ page, referrer }` — never an IP. The IP is derived
 * server-side from proxy headers, geolocated through IPstack when needed, and
 * stored in MongoDB. The response is deliberately minimal so no visitor data can
 * leak back to an anonymous caller.
 */

const MAX_BODY_BYTES = 2_048;

const NO_STORE = { "Cache-Control": "no-store" } as const;

function failure(
  code: TrackErrorResponse["code"],
  status: number,
  extraHeaders: Record<string, string> = {},
): NextResponse<TrackErrorResponse> {
  return NextResponse.json(
    { success: false, error: TRACK_ERROR_MESSAGES[code], code },
    { status, headers: { ...NO_STORE, ...extraHeaders } },
  );
}

function isJsonRequest(request: Request): boolean {
  return (request.headers.get("content-type") ?? "").includes("application/json");
}

export async function POST(request: Request): Promise<Response> {
  // Basic abuse protection so a client cannot flood the collection or burn
  // through IPstack quota with a single IP.
  const { limited, retryAfterSeconds } = checkRateLimitWithRule(getClientKey(request), TRACK_LIMIT);
  if (limited) {
    return failure("RATE_LIMITED", 429, { "Retry-After": String(retryAfterSeconds) });
  }

  const settings = await getSettings();
  if (!settings.visitorTracking) {
    return failure("DISABLED", 403);
  }

  if (!isJsonRequest(request)) {
    return failure("INVALID_REQUEST", 400);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return failure("INVALID_REQUEST", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure("INVALID_REQUEST", 400);
  }

  const parsed = trackPageSchema.safeParse(body);
  if (!parsed.success) {
    return failure("INVALID_REQUEST", 400);
  }

  if (!isDatabaseConfigured()) {
    // Analytics is best-effort; a missing database must never break the page.
    console.warn("[analytics/track] MONGODB_URI is not set — visit not recorded.");
    return NextResponse.json({ success: true }, { headers: NO_STORE });
  }

  try {
    await recordVisit(request, parsed.data.page, settings.trackReferrer ? parsed.data.referrer : undefined);
  } catch (error) {
    console.error("[analytics/track] Failed to record visit", error);
    return failure("INTERNAL_ERROR", 500);
  }

  return NextResponse.json({ success: true }, { headers: NO_STORE });
}

async function recordVisit(request: Request, page: string, referrer?: string): Promise<void> {
  const ip = getClientIp(request.headers);
  if (!ip) {
    console.warn("[analytics/track] Could not determine a client IP; visit skipped.");
    return;
  }

  const userAgent = request.headers.get("user-agent");
  const { deviceType, browser, operatingSystem } = parseUserAgent(userAgent);

  // The Referer header wins when the client did not supply one, because it is
  // set by the browser and cannot be spoofed by our own JS.
  const effectiveReferrer = referrer ?? request.headers.get("referer") ?? null;

  const geolocation = await resolveGeolocation(ip);

  await upsertVisitor({
    ip,
    page,
    referrer: effectiveReferrer,
    deviceType,
    browser,
    operatingSystem,
    geolocation,
  });
}

/**
 * Geolocation with an IP-stack call only when it is actually needed.
 *
 * - Private/loopback addresses can never be geolocated, so they are skipped.
 * - Any IPstack failure (missing key, quota, outage) is logged and tolerated:
 *   the visit is still recorded, just without location data.
 */
async function resolveGeolocation(ip: string): Promise<IpGeolocation | null> {
  if (isNonRoutableIp(ip)) return null;

  try {
    return await lookupIp(ip);
  } catch (error) {
    if (error instanceof IpstackError) {
      if (error.code === "NOT_CONFIGURED") {
        console.warn(`[analytics/track] ${error.message} Location data will be unavailable.`);
      } else {
        console.error(`[analytics/track] IPstack ${error.code}: ${error.message}`);
      }
      return null;
    }
    if (error instanceof DatabaseError) {
      console.error(`[analytics/track] Database ${error.code}: ${error.message}`);
      return null;
    }
    throw error;
  }
}
