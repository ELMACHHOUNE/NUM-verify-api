import "server-only";

import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth";
import { resolveDateRange } from "@/lib/date-range";
import type { AdminErrorCode } from "@/types/admin";
import type { DeviceType, VisitorQuery, VisitorSortField } from "@/types/analytics";

/**
 * Shared helpers for the protected `/api/admin/*` surface.
 *
 * Authorization is enforced here, on the server, for every admin endpoint —
 * the client never decides whether it may read visitor data.
 */

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

const STATUS_BY_CODE: Record<AdminErrorCode, number> = {
  INVALID_REQUEST: 400,
  NOT_CONFIGURED: 503,
  INVALID_CREDENTIALS: 401,
  RATE_LIMITED: 429,
  UNAUTHORIZED: 401,
  INTERNAL_ERROR: 500,
};

const MESSAGES: Record<AdminErrorCode, string> = {
  INVALID_REQUEST: "Invalid request.",
  NOT_CONFIGURED: "Admin access is not configured.",
  INVALID_CREDENTIALS: "Incorrect password.",
  RATE_LIMITED: "Too many requests. Please try again later.",
  UNAUTHORIZED: "Authentication required.",
  INTERNAL_ERROR: "Something went wrong.",
};

const NO_STORE = { "Cache-Control": "no-store" } as const;

export function adminError(
  code: AdminErrorCode,
  extraHeaders: Record<string, string> = {},
): NextResponse {
  return NextResponse.json(
    { success: false, error: MESSAGES[code], code },
    { status: STATUS_BY_CODE[code], headers: { ...NO_STORE, ...extraHeaders } },
  );
}

export function adminJson<T>(payload: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(payload, {
    ...init,
    headers: { ...NO_STORE, ...(init?.headers as Record<string, string> | undefined) },
  });
}

/**
 * Returns an error response when the caller is not an authenticated admin, or
 * `null` when the request may proceed.
 */
export async function rejectUnauthenticated(): Promise<NextResponse | null> {
  if (await isAdminAuthenticated()) return null;
  return adminError("UNAUTHORIZED");
}

type RawQuery = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function clean(value: string | undefined, max = 120): string {
  return (value ?? "").trim().slice(0, max);
}

/**
 * Builds a validated {@link VisitorQuery} from raw search params.
 *
 * Every value is clamped, so a hand-crafted query string cannot request an
 * unbounded page size, a negative page, or an unindexed sort.
 */
export function parseVisitorQuery(searchParams: URLSearchParams): VisitorQuery {
  const raw: RawQuery = Object.fromEntries(searchParams.entries());

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
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? Math.min(pageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE,
  };
}

function isDeviceType(value: string): value is DeviceType {
  return (
    value === "desktop" || value === "mobile" || value === "tablet" || value === "bot" || value === "other"
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
