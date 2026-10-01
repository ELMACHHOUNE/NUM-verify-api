import "server-only";

import { z } from "zod";

import type {
  IpGeolocation,
  IpstackErrorCode,
  ServiceStatus,
} from "@/types/ipstack";

/**
 * Server-only IPstack integration.
 *
 * The API key is read from `IPSTACK_API_KEY` and never leaves this module:
 * nothing here is imported by a client component, and no key material is part
 * of any return value or log line.
 *
 * Field availability depends on the configured plan. Only the core location
 * fields are treated as required; every optional module (`time_zone`,
 * `currency`, `connection`, `security`) is parsed opportunistically and ends up
 * as `null` when the plan does not expose it.
 */

const IPSTACK_ENDPOINT = "http://api.ipstack.com";
const REQUEST_TIMEOUT_MS = 8_000;

/**
 * `fields` is not requested: it is gated on higher tiers, so asking for the
 * full payload and reading what comes back works on every plan.
 */
const ipstackLookupSchema = z.object({
  ip: z.string().min(1),
  type: z.string().nullish(),

  country_code: z.string().nullish(),
  country_name: z.string().nullish(),
  region_code: z.string().nullish(),
  region_name: z.string().nullish(),
  city: z.string().nullish(),
  zip: z.string().nullish(),

  latitude: z.number().nullish(),
  longitude: z.number().nullish(),

  location: z
    .object({
      country_flag_emoji: z.string().nullish(),
      calling_code: z.string().nullish(),
      is_eu: z.boolean().nullish(),
    })
    .nullish(),

  time_zone: z
    .object({
      id: z.string().nullish(),
      current_time: z.string().nullish(),
      gmt_offset: z.number().nullish(),
      code: z.string().nullish(),
    })
    .nullish(),

  currency: z
    .object({
      code: z.string().nullish(),
      name: z.string().nullish(),
      symbol: z.string().nullish(),
    })
    .nullish(),

  connection: z
    .object({
      asn: z.number().nullish(),
      isp: z.string().nullish(),
      org: z.string().nullish(),
      domain: z.string().nullish(),
      connection_type: z.string().nullish(),
    })
    .nullish(),

  security: z
    .object({
      is_proxy: z.boolean().nullish(),
      proxy_type: z.string().nullish(),
      is_tor: z.boolean().nullish(),
      is_crawler: z.boolean().nullish(),
      threat_level: z.string().nullish(),
    })
    .nullish(),
});

const ipstackErrorSchema = z.object({
  success: z.literal(false),
  error: z
    .object({
      code: z.number().nullish(),
      type: z.string().nullish(),
      info: z.string().nullish(),
    })
    .nullish(),
});

/** Error raised by the IPstack integration. Carries a safe, user-facing code. */
export class IpstackError extends Error {
  readonly code: IpstackErrorCode;

  constructor(code: IpstackErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "IpstackError";
    this.code = code;
  }
}

/** Whether a key is present, without contacting the API. */
export function isIpstackConfigured(): boolean {
  return Boolean(process.env.IPSTACK_API_KEY?.trim());
}

function getApiKey(): string {
  const apiKey = process.env.IPSTACK_API_KEY?.trim();
  if (!apiKey) {
    throw new IpstackError("NOT_CONFIGURED", "IPSTACK_API_KEY is not set.");
  }
  return apiKey;
}

function trimOrNull(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Maps an IPstack error code onto one of our safe categories. */
function mapUpstreamCode(code: number | null | undefined): IpstackErrorCode {
  switch (code) {
    case 101: // missing_access_key
      return "NOT_CONFIGURED";
    case 104: // hourly_rate_limit_reached
    case 106: // daily_rate_limit_reached
      return "RATE_LIMITED";
    case 105: // monthly_rate_limit_reached
      return "RATE_LIMITED";
    case 301: // invalid_field / invalid ip on some tiers
      return "INVALID_IP";
    default:
      return "UPSTREAM_ERROR";
  }
}

/**
 * Converts a validated IPstack payload into the plan-safe record we persist.
 * Missing optional modules simply become `null`.
 */
function normalize(data: z.infer<typeof ipstackLookupSchema>, fallbackIp: string): IpGeolocation {
  const location = data.location ?? undefined;
  const timeZone = data.time_zone ?? undefined;
  const currency = data.currency ?? undefined;
  const connection = data.connection ?? undefined;

  return {
    ip: trimOrNull(data.ip) ?? fallbackIp,
    ipType: trimOrNull(data.type)?.toLowerCase() ?? null,

    countryCode: trimOrNull(data.country_code)?.toUpperCase() ?? null,
    countryName: trimOrNull(data.country_name),
    countryFlag: trimOrNull(location?.country_flag_emoji),
    callingCode: trimOrNull(location?.calling_code),
    isEu: typeof location?.is_eu === "boolean" ? location.is_eu : null,

    regionCode: trimOrNull(data.region_code),
    regionName: trimOrNull(data.region_name),

    city: trimOrNull(data.city),
    zip: trimOrNull(data.zip),

    latitude: typeof data.latitude === "number" ? data.latitude : null,
    longitude: typeof data.longitude === "number" ? data.longitude : null,

    timezoneId: trimOrNull(timeZone?.id),
    timezoneCode: trimOrNull(timeZone?.code),
    timezoneOffset: typeof timeZone?.gmt_offset === "number" ? timeZone.gmt_offset : null,

    currencyCode: trimOrNull(currency?.code),
    currencyName: trimOrNull(currency?.name),

    asn: typeof connection?.asn === "number" ? connection.asn : null,
    isp: trimOrNull(connection?.isp),
    org: trimOrNull(connection?.org),
    domain: trimOrNull(connection?.domain),
    connectionType: trimOrNull(connection?.connection_type),

    lookedUpAt: new Date().toISOString(),
  };
}

/**
 * Looks up an IP address and returns normalized geolocation data.
 *
 * Server-only. Never returns the API key, and never throws a raw upstream
 * payload to the caller — the original error is attached as `cause` for logs.
 *
 * @param ip A routable IPv4 or IPv6 address.
 */
export async function lookupIp(ip: string): Promise<IpGeolocation> {
  const apiKey = getApiKey();

  const url = new URL(`${IPSTACK_ENDPOINT}/${encodeURIComponent(ip)}`);
  url.searchParams.set("access_key", apiKey);
  url.searchParams.set("output", "json");

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const isTimeout =
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    throw new IpstackError(
      "UPSTREAM_UNAVAILABLE",
      isTimeout
        ? `IPstack request timed out after ${REQUEST_TIMEOUT_MS}ms.`
        : "IPstack request failed.",
      { cause: error },
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new IpstackError(
      "UPSTREAM_UNAVAILABLE",
      `IPstack returned a non-JSON response (HTTP ${response.status}).`,
      { cause: error },
    );
  }

  if (response.status === 429) {
    throw new IpstackError("RATE_LIMITED", "IPstack rate limit reached.", {
      cause: payload,
    });
  }

  const errorPayload = ipstackErrorSchema.safeParse(payload);
  if (errorPayload.success) {
    const upstream = errorPayload.data.error;
    throw new IpstackError(
      mapUpstreamCode(upstream?.code),
      `IPstack error ${upstream?.code ?? "unknown"} (${upstream?.type ?? "unknown"}).`,
      { cause: payload },
    );
  }

  if (!response.ok) {
    throw new IpstackError(
      "UPSTREAM_UNAVAILABLE",
      `IPstack responded with HTTP ${response.status}.`,
      { cause: payload },
    );
  }

  const lookup = ipstackLookupSchema.safeParse(payload);
  if (!lookup.success) {
    throw new IpstackError("UPSTREAM_ERROR", "Unexpected IPstack response shape.", {
      cause: lookup.error,
    });
  }

  return normalize(lookup.data, ip);
}

/** Human-readable copy for every failure the IPstack integration can produce. */
export const IPSTACK_ERROR_MESSAGES = {
  NOT_CONFIGURED: "IP geolocation service is not configured.",
  INVALID_IP: "The IP address could not be geolocated.",
  RATE_LIMITED: "The IP geolocation service has reached its request limit.",
  UPSTREAM_UNAVAILABLE: "The IP geolocation service is temporarily unavailable.",
  UPSTREAM_ERROR: "Unable to resolve IP location.",
  INTERNAL_ERROR: "Unable to resolve IP location.",
} as const satisfies Record<IpstackErrorCode, string>;

/**
 * Resolves the IP that issued *this* server-side HTTP call.
 *
 * Used only by the admin health panel. IPstack's requester lookup is the
 * cheapest possible probe — one request, no paid lookup — so it verifies that
 * the key is accepted without spending a geolocation credit on a visitor.
 */
export async function lookupRequesterIp(): Promise<string> {
  const apiKey = getApiKey();
  const url = new URL(`${IPSTACK_ENDPOINT}/`);
  url.searchParams.set("access_key", apiKey);
  url.searchParams.set("output", "json");

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new IpstackError("UPSTREAM_UNAVAILABLE", "IPstack request failed.", {
      cause: error,
    });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new IpstackError(
      "UPSTREAM_UNAVAILABLE",
      `IPstack returned a non-JSON response (HTTP ${response.status}).`,
      { cause: error },
    );
  }

  const errorPayload = ipstackErrorSchema.safeParse(payload);
  if (errorPayload.success) {
    const upstream = errorPayload.data.error;
    throw new IpstackError(
      mapUpstreamCode(upstream?.code),
      `IPstack error ${upstream?.code ?? "unknown"} (${upstream?.type ?? "unknown"}).`,
      { cause: payload },
    );
  }

  if (!response.ok) {
    throw new IpstackError(
      "UPSTREAM_UNAVAILABLE",
      `IPstack responded with HTTP ${response.status}.`,
      { cause: payload },
    );
  }

  const requester = ipstackLookupSchema.safeParse(payload);
  if (!requester.success) {
    throw new IpstackError("UPSTREAM_ERROR", "Unexpected IPstack response shape.", {
      cause: requester.error,
    });
  }

  return trimOrNull(requester.data.ip) ?? "unknown";
}

/**
 * Health probe for the admin settings page. Costs exactly one requester lookup,
 * which every plan supports, and never returns key material.
 */
export async function checkIpstackHealth(): Promise<{ status: ServiceStatus; detail: string }> {
  if (!isIpstackConfigured()) {
    return { status: "not_configured", detail: "IPSTACK_API_KEY is not set" };
  }

  try {
    const ip = await lookupRequesterIp();
    return { status: "connected", detail: `Key accepted (responder ${ip})` };
  } catch (error) {
    if (error instanceof IpstackError && error.code === "NOT_CONFIGURED") {
      return { status: "not_configured", detail: error.message };
    }
    if (error instanceof IpstackError && error.code === "RATE_LIMITED") {
      return { status: "error", detail: IPSTACK_ERROR_MESSAGES.RATE_LIMITED };
    }
    return { status: "error", detail: error instanceof Error ? error.message : "Unknown error" };
  }
}
