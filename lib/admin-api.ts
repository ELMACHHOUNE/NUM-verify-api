import "server-only";

import { resolveDateRange } from "@/lib/date-range";
import type { DeviceType, VisitorQuery, VisitorSortField } from "@/types/analytics";

/**
 * Query-string helpers for the `/admin` surface.
 *
 * Authorization lives in `lib/auth-guard.ts`; this module only deals with turning
 * untrusted search params into a bounded, validated query object.
 */

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
export const MAX_PAGE = 10_000;

type RawValue = string | string[] | undefined;

function first(value: RawValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function clean(value: string | undefined, max = 120): string {
  return (value ?? "").trim().slice(0, max);
}

function isDeviceType(value: string): value is DeviceType {
  return (
    value === "desktop" ||
    value === "mobile" ||
    value === "tablet" ||
    value === "bot" ||
    value === "other"
  );
}

function isSortField(value: string): value is VisitorSortField {
  return (
    value === "lastSeen" ||
    value === "firstSeen" ||
    value === "visitCount" ||
    value === "countryName" ||
    value === "city" ||
    value === "ip"
  );
}

/**
 * Builds a {@link VisitorQuery} from raw search params.
 *
 * Every value is clamped, so a hand-crafted query string cannot request an
 * unbounded page size, a negative page, or an unindexed sort.
 */
export function parseVisitorQuery(searchParams: URLSearchParams): VisitorQuery {
  const raw: Record<string, RawValue> = Object.fromEntries(searchParams.entries());

  const range = resolveDateRange(
    clean(first(raw.range), 20),
    clean(first(raw.from), 10),
    clean(first(raw.to), 10),
  );

  const sortField = clean(first(raw.sort), 20);
  const direction = clean(first(raw.direction), 4);
  const page = Number.parseInt(clean(first(raw.page), 8), 10);
  const pageSize = Number.parseInt(clean(first(raw.pageSize), 4), 10);
  const device = clean(first(raw.device), 12);

  return {
    search: clean(first(raw.search), 80),
    countryCode: clean(first(raw.country), 8).toUpperCase() || null,
    city: clean(first(raw.city), 120) || null,
    deviceType: isDeviceType(device) ? device : null,
    browser: clean(first(raw.browser), 60) || null,
    operatingSystem: clean(first(raw.os), 60) || null,
    range,
    sort: isSortField(sortField) ? sortField : "lastSeen",
    direction: direction === "asc" ? "asc" : "desc",
    page:
      Number.isFinite(page) && page > 0 ? Math.min(page, MAX_PAGE) : 1,
    pageSize:
      Number.isFinite(pageSize) && pageSize > 0
        ? Math.min(pageSize, MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE,
  };
}