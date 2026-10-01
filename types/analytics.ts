/**
 * Visitor analytics domain types.
 *
 * These shapes are the contract between the MongoDB aggregation layer
 * (`lib/analytics.ts`), the protected admin API routes and the dashboard UI.
 * Everything is plain JSON so server components and client charts can consume
 * the same values without a serialization step.
 */

import type { ServiceStatus } from "./ipstack";

/* -------------------------------------------------------------------------- */
/* Device                                                                      */
/* -------------------------------------------------------------------------- */

export const DEVICE_TYPES = ["desktop", "mobile", "tablet", "bot", "other"] as const;

export type DeviceType = (typeof DEVICE_TYPES)[number];

/* -------------------------------------------------------------------------- */
/* Date ranges                                                                 */
/* -------------------------------------------------------------------------- */

export const DATE_RANGE_PRESETS = [
  "today",
  "yesterday",
  "last7",
  "last30",
  "thisYear",
  "allTime",
  "custom",
] as const;

export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

export interface ResolvedDateRange {
  /** Inclusive lower bound (UTC). */
  from: Date | null;
  /** Exclusive upper bound (UTC). */
  to: Date;
  preset: DateRangePreset;
  label: string;
}

/** Granularity used to bucket the visitors-over-time series. */
export type TimeSeriesGranularity = "hour" | "day" | "month";

/* -------------------------------------------------------------------------- */
/* Aggregates                                                                  */
/* -------------------------------------------------------------------------- */

export interface DashboardStats {
  /** Unique visitor records known to the database, ignoring the range. */
  totalVisitors: number;
  /** Unique visitors whose last activity falls inside the selected range. */
  visitorsInRange: number;
  /** Visitors first seen inside the selected range. */
  newVisitorsInRange: number;
  /** Visitors with activity since 00:00 UTC today. */
  visitorsToday: number;
  /** Visitors seen inside the "active" window. */
  activeVisitors: number;
  /** Length of the active window in minutes, so the UI can explain it. */
  activeWindowMinutes: number;
  /** Visitors in range with more than one recorded visit. */
  returningVisitors: number;
  /** `returningVisitors / visitorsInRange`, or 0 when the range is empty. */
  returningRate: number;

  /** Distinct detected countries across the whole collection. */
  countries: number;
  /** Distinct detected cities across the whole collection. */
  cities: number;

  topCountry: { code: string | null; name: string; visitors: number } | null;
  topCity: { name: string; countryName: string | null; visitors: number } | null;

  range: {
    preset: DateRangePreset;
    label: string;
    from: string | null;
    to: string;
  };
}

export interface TimeSeriesPoint {
  /** Bucket start as `YYYY-MM-DD` (or `YYYY-MM-DDTHH` for hourly buckets). */
  key: string;
  label: string;
  visitors: number;
}

/** Generic "label + count" breakdown used by the geography and device charts. */
export interface BreakdownItem {
  /** Stable grouping key, e.g. an ISO country code or a browser name. */
  key: string;
  label: string;
  visitors: number;
  /** 0–1 share of the range total. */
  share: number;
}

export interface CountryBreakdownItem extends BreakdownItem {
  code: string | null;
  flag: string | null;
}

export interface CityBreakdownItem extends BreakdownItem {
  countryName: string | null;
}

export interface PageBreakdownItem extends BreakdownItem {
  path: string;
}

/* -------------------------------------------------------------------------- */
/* Visitors                                                                    */
/* -------------------------------------------------------------------------- */

/** Row shape returned by the paginated visitors endpoint. */
export interface VisitorListItem {
  id: string;
  ip: string;
  countryCode: string | null;
  countryName: string | null;
  countryFlag: string | null;
  regionName: string | null;
  city: string | null;
  isp: string | null;
  connectionType: string | null;
  deviceType: DeviceType | null;
  browser: string | null;
  operatingSystem: string | null;
  timezone: string | null;
  page: string | null;
  referrer: string | null;
  firstSeen: string;
  lastSeen: string;
  visitCount: number;
}

/** Full record for the visitor details view. */
export interface VisitorDetail extends VisitorListItem {
  ipType: string | null;
  callingCode: string | null;
  regionCode: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  timezoneOffset: number | null;
  currencyCode: string | null;
  asn: number | null;
  org: string | null;
  geolocatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecentVisitorItem {
  id: string;
  ip: string;
  countryCode: string | null;
  countryName: string | null;
  countryFlag: string | null;
  city: string | null;
  browser: string | null;
  operatingSystem: string | null;
  deviceType: DeviceType | null;
  page: string | null;
  lastSeen: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* -------------------------------------------------------------------------- */
/* Visitors table query                                                        */
/* -------------------------------------------------------------------------- */

export const VISITOR_SORT_FIELDS = [
  "lastSeen",
  "firstSeen",
  "visitCount",
  "countryName",
  "city",
  "ip",
] as const;

export type VisitorSortField = (typeof VISITOR_SORT_FIELDS)[number];

export type SortDirection = "asc" | "desc";

/** Normalized, validated query for `/admin/visitors`. */
export interface VisitorQuery {
  search: string;
  countryCode: string | null;
  city: string | null;
  deviceType: DeviceType | null;
  browser: string | null;
  operatingSystem: string | null;
  range: ResolvedDateRange;
  sort: VisitorSortField;
  direction: SortDirection;
  page: number;
  pageSize: number;
}

/** Distinct values backing the filter dropdowns. */
export interface VisitorFilterOptions {
  countries: { code: string; name: string }[];
  cities: string[];
  devices: string[];
  browsers: string[];
  operatingSystems: string[];
}

/** One CSV row produced by the export endpoint. */
export interface VisitorExportRow {
  ip: string;
  country: string;
  region: string;
  city: string;
  isp: string;
  device: string;
  browser: string;
  os: string;
  firstSeen: string;
  lastSeen: string;
  visits: number;
}

/* -------------------------------------------------------------------------- */
/* Settings                                                                    */
/* -------------------------------------------------------------------------- */

export const RETENTION_OPTIONS = [30, 90, 180, 365] as const;

export type RetentionDays = (typeof RETENTION_OPTIONS)[number];

export const ACTIVE_WINDOW_OPTIONS = [1, 5, 15, 30] as const;

export type ActiveWindowMinutes = (typeof ACTIVE_WINDOW_OPTIONS)[number];

export interface AppSettings {
  visitorTracking: boolean;
  trackPageViews: boolean;
  trackReferrer: boolean;
  dataRetentionDays: RetentionDays;
  activeWindowMinutes: ActiveWindowMinutes;
  updatedAt: string | null;
}

/* -------------------------------------------------------------------------- */
/* Tracking endpoint                                                           */
/* -------------------------------------------------------------------------- */

export interface TrackPagePayload {
  page: string;
  referrer?: string;
}

export interface TrackSuccessResponse {
  success: true;
}

export interface TrackErrorResponse {
  success: false;
  error: string;
  code: "INVALID_REQUEST" | "DISABLED" | "RATE_LIMITED" | "INTERNAL_ERROR";
}

export type TrackResponse = TrackSuccessResponse | TrackErrorResponse;

/* -------------------------------------------------------------------------- */
/* Health                                                                      */
/* -------------------------------------------------------------------------- */

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  detail: string;
}

export interface HealthReport {
  checkedAt: string;
  services: ServiceHealth[];
}
