/**
 * IPstack integration types.
 *
 * IPstack bundles its response into a fixed core (`ip`, country, region, city,
 * coordinates) plus a set of optional modules — `time_zone`, `currency`,
 * `connection`, `security` — that only exist on higher plan tiers. Every module
 * field is therefore optional and consumers must degrade gracefully.
 */

/** Raw, plan-aware IPstack lookup payload. */
export interface IpstackResponse {
  ip: string;
  type?: string | null;

  continent_code?: string | null;
  continent_name?: string | null;

  country_code?: string | null;
  country_name?: string | null;

  region_code?: string | null;
  region_name?: string | null;

  city?: string | null;
  zip?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  location?: {
    country_flag?: string | null;
    country_flag_emoji?: string | null;
    country_flag_url?: string | null;
    calling_code?: string | null;
    is_eu?: boolean | null;
  } | null;

  time_zone?: {
    id?: string | null;
    current_time?: string | null;
    gmt_offset?: number | null;
    code?: string | null;
  } | null;

  currency?: {
    code?: string | null;
    name?: string | null;
    symbol?: string | null;
    is_local_symbol?: boolean | null;
  } | null;

  connection?: {
    asn?: number | null;
    isp?: string | null;
    org?: string | null;
    domain?: string | null;
    connection_type?: string | null;
  } | null;

  security?: {
    is_proxy?: boolean | null;
    proxy_type?: string | null;
    is_vpn?: boolean | null;
    is_tor?: boolean | null;
    is_crawler?: boolean | null;
    threat_level?: string | null;
  } | null;
}

/** Error envelope IPstack returns instead of a payload. */
export interface IpstackErrorBody {
  success: false;
  error?: {
    code?: number | null;
    type?: string | null;
    info?: string | null;
  } | null;
}

/** Machine-readable failure reasons for the IPstack integration. */
export const IPSTACK_ERROR_CODES = [
  "NOT_CONFIGURED",
  "INVALID_IP",
  "RATE_LIMITED",
  "UPSTREAM_UNAVAILABLE",
  "UPSTREAM_ERROR",
  "INTERNAL_ERROR",
] as const;

export type IpstackErrorCode = (typeof IPSTACK_ERROR_CODES)[number];

/**
 * Normalized, plan-safe geolocation record persisted with every visitor.
 *
 * Coordinates come from an IP-derived estimate and must always be presented as
 * "approximate IP-based location", never as a physical position.
 */
export interface IpGeolocation {
  ip: string;
  ipType: string | null;

  countryCode: string | null;
  countryName: string | null;
  countryFlag: string | null;
  callingCode: string | null;
  isEu: boolean | null;

  regionCode: string | null;
  regionName: string | null;

  city: string | null;
  zip: string | null;

  latitude: number | null;
  longitude: number | null;

  timezoneId: string | null;
  timezoneCode: string | null;
  timezoneOffset: number | null;

  currencyCode: string | null;
  currencyName: string | null;

  asn: number | null;
  isp: string | null;
  org: string | null;
  domain: string | null;
  connectionType: string | null;

  /** ISO timestamp of the moment IPstack answered. */
  lookedUpAt: string;
}

/** Plan-independent service status used by the admin health panel. */
export type ServiceStatus = "connected" | "not_configured" | "error" | "unknown";
