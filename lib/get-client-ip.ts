/**
 * Client IP resolution.
 *
 * The visitor IP must be derived on the server from infrastructure-controlled
 * headers. Client-supplied headers are trivially forgeable, so this helper only
 * reads headers that a *trusted* edge (CDN / reverse proxy) is expected to
 * overwrite on every request, and it documents the fallback behaviour.
 *
 * Resolution order:
 *
 * 1. `TRUSTED_PROXY_COUNT` — when set to N, the Nth entry from the right of
 *    `x-forwarded-for` is used. Every proxy appends to the list, so counting
 *    from the right skips entries injected by untrusted hops.
 * 2. Edge headers that trusted infrastructure overwrites rather than appends to:
 *    `cf-connecting-ip`, `x-vercel-forwarded-for`, `true-client-ip`,
 *    `fastly-client-ip`, `x-client-ip`.
 * 3. `x-real-ip`, then `x-forwarded-for` (leftmost entry). These are only as
 *    trustworthy as the proxy configuration — see the README for the caveats.
 * 4. Loopback, which is what a bare `next dev` server sees.
 *
 * Assumptions are documented in the README under "Visitor IP resolution".
 */

/** Headers a trusted edge sets *and owns* (client cannot influence them). */
const EDGE_IP_HEADERS = [
  "cf-connecting-ip", // Cloudflare
  "x-vercel-forwarded-for", // Vercel
  "true-client-ip", // Akamai / Fastly (Enterprise)
  "fastly-client-ip", // Fastly
  "x-client-ip", // AWS CloudFront (legacy)
  "x-real-ip", // nginx `proxy_set_header X-Real-IP $remote_addr`
] as const;

const FORWARDED_FOR_HEADER = "x-forwarded-for";

const LOOPBACK_IPV4 = "127.0.0.1";
const LOOPBACK_IPV6 = "::1";

/** Strips brackets, zone index and any `:port` suffix from a forwarded value. */
function cleanCandidate(raw: string): string {
  let value = raw.trim();
  if (value.startsWith("[")) {
    // `[::1]:443` or `[::1]`
    const closing = value.indexOf("]");
    if (closing !== -1) return value.slice(1, closing).toLowerCase();
  }
  value = value.toLowerCase();

  // A bare IPv6 address contains multiple colons; only strip a trailing port
  // when the value is clearly host:port (exactly one colon before digits).
  const lastColon = value.lastIndexOf(":");
  if (lastColon !== -1 && value.indexOf(":") === lastColon) {
    const port = value.slice(lastColon + 1);
    if (/^\d{1,5}$/.test(port)) value = value.slice(0, lastColon);
  }

  return value.replace(/%.*$/, "");
}

function isPlausibleIp(value: string): boolean {
  if (value.length === 0 || value.length > 45) return false;
  // IPv4: four dotted decimal octets.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    return value.split(".").every((octet) => Number(octet) <= 255);
  }
  // IPv6: hex groups, optional `::` compression, optional IPv4 tail.
  if (!/^[0-9a-f:.]+$/.test(value)) return false;
  if ((value.match(/::/g) ?? []).length > 1) return false;
  if (!value.includes(":") && !value.includes(".")) return false;
  return true;
}

/** Number of trusted proxies between the internet and this app. */
function trustedProxyCount(): number {
  const raw = process.env.TRUSTED_PROXY_COUNT?.trim();
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 32) : 0;
}

function fromForwardedFor(headerValue: string): string | null {
  const hops = headerValue
    .split(",")
    .map((entry) => cleanCandidate(entry))
    .filter(isPlausibleIp);

  if (hops.length === 0) return null;

  const hopsToSkip = trustedProxyCount();
  if (hopsToSkip > 0) {
    const index = hops.length - hopsToSkip;
    return hops[index] ?? hops[0];
  }

  return hops[0];
}

function readHeader(headers: Headers, name: string): string | null {
  const raw = headers.get(name);
  if (!raw) return null;

  // Edge headers occasionally carry a comma-separated list; the first entry is
  // the address the edge observed.
  const first = cleanCandidate(raw.split(",")[0] ?? "");
  return isPlausibleIp(first) ? first : null;
}

/**
 * Best-effort client IP for a request.
 *
 * @returns a normalized IPv4/IPv6 string, or `null` when nothing usable is found.
 */
export function getClientIp(headers: Headers): string | null {
  const hops = trustedProxyCount();
  if (hops > 0) {
    const forwarded = headers.get(FORWARDED_FOR_HEADER);
    if (forwarded) {
      const resolved = fromForwardedFor(forwarded);
      if (resolved) return resolved;
    }
  }

  for (const header of EDGE_IP_HEADERS) {
    const value = readHeader(headers, header);
    if (value) return value;
  }

  const forwarded = headers.get(FORWARDED_FOR_HEADER);
  if (forwarded) {
    const resolved = fromForwardedFor(forwarded);
    if (resolved) return resolved;
  }

  return null;
}

/**
 * Client IP used as a rate-limit bucket key. Unlike {@link getClientIp} this
 * never returns `null`, so a request with a stripped header still shares one
 * bucket instead of bypassing the limiter entirely.
 */
export function getRateLimitKey(headers: Headers): string {
  return getClientIp(headers) ?? "unknown";
}

/** Loopback fallback for local development, where no proxy exists. */
export function getLocalDevelopmentIp(): string {
  return LOOPBACK_IPV4;
}

export const LOOPBACK_ADDRESSES = [LOOPBACK_IPV4, LOOPBACK_IPV6] as const;

/**
 * Loopback and RFC1918 ranges cannot be geolocated, so the tracking pipeline
 * skips the IPstack call and stores the record without location data.
 */
export function isNonRoutableIp(ip: string): boolean {
  if ((LOOPBACK_ADDRESSES as readonly string[]).includes(ip)) return true;
  if (ip === "0.0.0.0" || ip === "::" || ip === "::1") return true;
  if (ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) return true;
  // Carrier-grade NAT (100.64/10).
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)) return true;

  const octets = ip.split(".");
  if (octets.length !== 4) return false;

  const [a, b] = octets.map(Number);
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}
