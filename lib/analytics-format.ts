/**
 * Display formatting shared by the admin dashboard.
 *
 * Kept free of server-only imports so both server components and client charts
 * can use it. Missing values consistently render as "Not available" so an
 * absent optional API field never looks like a zero.
 */

import type {
  BreakdownItem,
  DeviceType,
  VisitorSortField,
  SortDirection,
} from "@/types/analytics";

export const UNAVAILABLE_LABEL = "Not available";

/** Compact number formatting: 1,248 / 12.4k / 1.2M. */
export function formatNumber(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-GB", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Exact count with thousands separators, used beside charts. */
export function formatCount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-GB").format(value);
}

/** `0.38` -> `38%`. */
export function formatPercent(ratio: number | null | undefined): string {
  if (typeof ratio !== "number" || !Number.isFinite(ratio)) return "0%";
  return new Intl.NumberFormat("en-GB", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(ratio);
}

/** Renders an optional string, falling back to a neutral placeholder. */
export function orUnavailable(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : UNAVAILABLE_LABEL;
}

/** `0.05` -> `UTC+05:00`; `5.5` -> `UTC+05:30`. */
export function formatGmtOffset(offsetHours: number | null | undefined): string {
  if (typeof offsetHours !== "number" || !Number.isFinite(offsetHours)) {
    return UNAVAILABLE_LABEL;
  }

  const sign = offsetHours < 0 ? "-" : "+";
  const absolute = Math.abs(offsetHours);
  const hours = Math.floor(absolute);
  const minutes = Math.round((absolute - hours) * 60);

  return `UTC${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

const DEVICE_LABELS: Record<DeviceType, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  bot: "Bot",
  other: "Other",
};

export function formatDeviceType(deviceType: DeviceType | string | null | undefined): string {
  if (!deviceType) return UNAVAILABLE_LABEL;
  return DEVICE_LABELS[deviceType as DeviceType] ?? "Other";
}

const RELATIVE_UNITS: { limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { limit: 60, divisor: 1, unit: "second" },
  { limit: 3_600, divisor: 60, unit: "minute" },
  { limit: 86_400, divisor: 3_600, unit: "hour" },
  { limit: 604_800, divisor: 86_400, unit: "day" },
  { limit: 2_629_800, divisor: 604_800, unit: "week" },
  { limit: 31_557_600, divisor: 2_629_800, unit: "month" },
];

const relativeFormatter = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

/** "2 minutes ago" from an ISO timestamp. */
export function formatRelativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return UNAVAILABLE_LABEL;

  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return UNAVAILABLE_LABEL;

  const deltaSeconds = Math.round((timestamp - now) / 1000);
  const absoluteSeconds = Math.abs(deltaSeconds);

  if (absoluteSeconds < 10) return "just now";

  for (const { limit, divisor, unit } of RELATIVE_UNITS) {
    if (absoluteSeconds < limit) {
      return relativeFormatter.format(Math.round(deltaSeconds / divisor), unit);
    }
  }

  return relativeFormatter.format(Math.round(deltaSeconds / 31_557_600), "year");
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** Absolute UTC timestamp, labelled as UTC so it is never ambiguous. */
export function formatDateTimeUtc(iso: string | null | undefined): string {
  if (!iso) return UNAVAILABLE_LABEL;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return UNAVAILABLE_LABEL;
  return `${dateTimeFormatter.format(date)} UTC`;
}

export function formatDateUtc(iso: string | null | undefined): string {
  if (!iso) return UNAVAILABLE_LABEL;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return UNAVAILABLE_LABEL;
  return dateFormatter.format(date);
}

/** Label for a referrer host, distinguishing internal navigation. */
export function formatReferrer(referrer: string | null | undefined): string {
  if (!referrer || referrer.trim().length === 0) return "Direct / Unknown";
  try {
    return new URL(referrer).host || referrer;
  } catch {
    return referrer;
  }
}

export const SORT_FIELD_LABELS: Record<VisitorSortField, string> = {
  lastSeen: "Last seen",
  firstSeen: "First seen",
  visitCount: "Visits",
  countryName: "Country",
  city: "City",
  ip: "IP address",
};

/** Maps a column key onto its sortable field, when it has one. */
export function sortFieldForColumn(
  column: string,
): { field: VisitorSortField; direction: SortDirection } | null {
  switch (column) {
    case "lastSeen":
    case "firstSeen":
    case "visitCount":
      return { field: column, direction: "desc" };
    case "country":
      return { field: "countryName", direction: "asc" };
    case "city":
      return { field: "city", direction: "asc" };
    case "ip":
      return { field: "ip", direction: "asc" };
    default:
      return null;
  }
}

/** Widest bar value in a breakdown, used to scale the inline meters. */
export function maxVisitors(items: readonly BreakdownItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.visitors), 0);
}

/** `0.82` -> `82%` width for an inline meter. */
export function barWidth(visitors: number, max: number): string {
  if (max <= 0) return "0%";
  return `${Math.max(2, Math.round((visitors / max) * 100))}%`;
}
