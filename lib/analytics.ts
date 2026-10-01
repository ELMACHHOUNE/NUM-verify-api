import "server-only";

import type { AccumulatorOperator } from "mongoose";

import { Visitor } from "@/models/Visitor";
import {
  formatBucketLabel,
  GRANULARITY_UNIT,
  pickGranularity,
  startOfTodayUtc,
} from "@/lib/date-range";
import { getConnection } from "@/lib/mongodb";
import type {
  BreakdownItem,
  CityBreakdownItem,
  CountryBreakdownItem,
  DashboardStats,
  DeviceType,
  PageBreakdownItem,
  Paginated,
  RecentVisitorItem,
  ResolvedDateRange,
  TimeSeriesPoint,
  VisitorDetail,
  VisitorExportRow,
  VisitorFilterOptions,
  VisitorListItem,
  VisitorQuery,
} from "@/types/analytics";
import type { IpGeolocation } from "@/types/ipstack";

/**
 * Server-side analytics.
 *
 * Every number rendered by the admin area comes from here, and each figure is
 * produced by a MongoDB aggregation pipeline or a projected `find` — the
 * collection is never drained into JavaScript to be counted by hand.
 *
 * Range semantics: a visitor is "in range" when `lastSeen` falls inside the
 * window (`from` inclusive, `to` exclusive). `firstSeen` drives the "new
 * visitors" metric. Known crawlers are excluded from visitor metrics.
 */

/** Re-geolocate a visitor at most once every 24 hours. */
const GEOLOCATION_TTL_MS = 24 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** Maximum number of rows a single CSV export may contain. */
export const EXPORT_ROW_LIMIT = 5_000;

const UNKNOWN_LABEL = "Unknown";

const EXCLUDE_BOTS = { deviceType: { $ne: "bot" } } as const;

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

/** Permissive match clause; cast at the call boundary to `FilterQuery`. */
type MatchClause = Record<string, unknown>;

/* -------------------------------------------------------------------------- */
/* Primitives                                                                  */
/* -------------------------------------------------------------------------- */

async function rawCollection() {
  const connection = await getConnection();
  return connection.connection.collection("visitors");
}

/** `{ $gte, $lt }` window for a date field; the lower bound is optional. */
function rangeWindow(range: ResolvedDateRange): Record<string, Date> {
  return range.from ? { $gte: range.from, $lt: range.to } : { $lt: range.to };
}

function rangeMatch(field: string, range: ResolvedDateRange): MatchClause {
  return { [field]: rangeWindow(range) };
}

/** Visitor match for the selected range, excluding known crawlers. */
function humanInRange(range: ResolvedDateRange): MatchClause {
  return { $and: [EXCLUDE_BOTS, rangeMatch("lastSeen", range)] };
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return new Date(value).toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date(0).toISOString();
}

/** Escapes a search term so it is matched literally rather than as a regex. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toDeviceType(value: unknown): DeviceType | null {
  const parsed = nullableString(value);
  return parsed === "desktop" ||
    parsed === "mobile" ||
    parsed === "tablet" ||
    parsed === "bot" ||
    parsed === "other"
    ? parsed
    : null;
}

function withShare<T extends BreakdownItem>(items: T[], total: number): T[] {
  return items.map((item) =>
    item.visitors === total || total === 0
      ? { ...item, share: 1 }
      : { ...item, share: item.visitors / total },
  );
}

function addUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

/** Guards `findById`-style calls against malformed / NoSQL-injected ids. */
export function isValidObjectId(id: string): boolean {
  return OBJECT_ID_PATTERN.test(id);
}

/* -------------------------------------------------------------------------- */
/* Tracking                                                                    */
/* -------------------------------------------------------------------------- */

export interface TrackInput {
  ip: string;
  page: string | null;
  referrer: string | null;
  deviceType: DeviceType;
  browser: string | null;
  operatingSystem: string | null;
  /** Freshly fetched IPstack snapshot, or `null` when the stored one is reused. */
  geolocation: IpGeolocation | null;
}

export type TrackOutcome = { created: boolean; geolocated: boolean };

/**
 * Upserts one visitor record.
 *
 * Deduplication is `IP + time window`: when a record for the same IP already
 * exists, `lastSeen` / `visitCount` / device signals are refreshed and the
 * stored geolocation is reused, so IPstack quota is spent at most once per IP
 * per {@link GEOLOCATION_TTL_MS}.
 */
export async function upsertVisitor(input: TrackInput): Promise<TrackOutcome> {
  await getConnection();

  const now = new Date();
  const existing = await Visitor.findOne({ ip: input.ip })
    .select({ geolocatedAt: 1, _id: 1 })
    .lean()
    .exec();

  const storedGeoAt = existing?.geolocatedAt ? new Date(existing.geolocatedAt) : null;
  const needsGeolocation =
    input.geolocation !== null ||
    storedGeoAt === null ||
    now.getTime() - storedGeoAt.getTime() > GEOLOCATION_TTL_MS;

  const geo = input.geolocation;
  const geoFields: MatchClause = geo
    ? {
        ipType: geo.ipType,
        countryCode: geo.countryCode,
        countryName: geo.countryName,
        countryFlag: geo.countryFlag,
        callingCode: geo.callingCode,
        regionCode: geo.regionCode,
        regionName: geo.regionName,
        city: geo.city,
        zip: geo.zip,
        latitude: geo.latitude,
        longitude: geo.longitude,
        timezone: geo.timezoneId,
        timezoneCode: geo.timezoneCode,
        timezoneOffset: geo.timezoneOffset,
        currencyCode: geo.currencyCode,
        asn: geo.asn,
        isp: geo.isp,
        org: geo.org,
        connectionType: geo.connectionType,
        geolocatedAt: now,
      }
    : {};

  // Device signals refresh on every hit so a desktop→mobile switch shows up.
  // The raw User-Agent itself is never persisted.
  const activityFields: MatchClause = {
    deviceType: input.deviceType,
    browser: input.browser,
    operatingSystem: input.operatingSystem,
    lastSeen: now,
    ...(input.page ? { page: input.page } : {}),
    ...(input.referrer ? { referrer: input.referrer } : {}),
  };

  await Visitor.updateOne(
    { ip: input.ip },
    {
      $set: { ...activityFields, ...(needsGeolocation ? geoFields : {}) },
      $setOnInsert: { ip: input.ip, firstSeen: now, ...activityFields, ...geoFields },
      // `visitCount` has no schema default, so `$inc` creates it as 1 on insert.
      $inc: { visitCount: 1 },
    },
    { upsert: true },
  );

  return { created: existing === null, geolocated: needsGeolocation };
}

/* -------------------------------------------------------------------------- */
/* Dashboard aggregates                                                        */
/* -------------------------------------------------------------------------- */

interface CountFacetResult {
  totalVisitors: number;
  visitorsInRange: number;
  newVisitorsInRange: number;
  visitorsToday: number;
  returningVisitors: number;
}

/** One round trip for every dashboard KPI. */
export async function getDashboardStats(
  range: ResolvedDateRange,
  activeWindowMinutes: number,
): Promise<DashboardStats> {
  await getConnection();
  const visitors = await rawCollection();
  const inRange = humanInRange(range);
  const activeSince = new Date(Date.now() - activeWindowMinutes * 60_000);

  const [summary] = await visitors
    .aggregate<CountFacetResult>([
      {
        $facet: {
          totals: [{ $count: "value" }],
          inRange: [{ $match: inRange }, { $count: "value" }],
          newInRange: [
            { $match: { $and: [EXCLUDE_BOTS, rangeMatch("firstSeen", range)] } },
            { $count: "value" },
          ],
          today: [
            { $match: { $and: [EXCLUDE_BOTS, { lastSeen: { $gte: startOfTodayUtc() } }] } },
            { $count: "value" },
          ],
          returning: [{ $match: inRange }, { $match: { visitCount: { $gt: 1 } } }, { $count: "value" }],
        },
      },
      {
        $project: {
          _id: 0,
          totalVisitors: { $ifNull: [{ $first: "$totals.value" }, 0] },
          visitorsInRange: { $ifNull: [{ $first: "$inRange.value" }, 0] },
          newVisitorsInRange: { $ifNull: [{ $first: "$newInRange.value" }, 0] },
          visitorsToday: { $ifNull: [{ $first: "$today.value" }, 0] },
          returningVisitors: { $ifNull: [{ $first: "$returning.value" }, 0] },
        },
      },
    ])
    .toArray();

  const [geography] = await visitors
    .aggregate<{ countries: number; cities: number }>([
      { $match: EXCLUDE_BOTS },
      { $group: { _id: null, countries: { $addToSet: "$countryCode" }, cities: { $addToSet: "$city" } } },
      {
        $project: {
          _id: 0,
          countries: {
            $size: { $filter: { input: "$countries", as: "code", cond: { $ne: ["$$code", null] } } },
          },
          cities: {
            $size: { $filter: { input: "$cities", as: "city", cond: { $ne: ["$$city", null] } } },
          },
        },
      },
    ])
    .toArray();

  const [active] = await visitors
    .aggregate<{ count: number }>([
      { $match: { $and: [EXCLUDE_BOTS, { lastSeen: { $gte: activeSince } }] } },
      { $count: "count" },
    ])
    .toArray();

  const [topCountry] = await getVisitorsByCountry(range, 1);
  const [topCity] = await getVisitorsByCity(range, 1);

  const totals: CountFacetResult = summary ?? {
    totalVisitors: 0,
    visitorsInRange: 0,
    newVisitorsInRange: 0,
    visitorsToday: 0,
    returningVisitors: 0,
  };

  return {
    totalVisitors: totals.totalVisitors ?? 0,
    visitorsInRange: totals.visitorsInRange ?? 0,
    newVisitorsInRange: totals.newVisitorsInRange ?? 0,
    visitorsToday: totals.visitorsToday ?? 0,
    activeVisitors: active?.count ?? 0,
    activeWindowMinutes,
    returningVisitors: totals.returningVisitors ?? 0,
    returningRate:
      (totals.visitorsInRange ?? 0) > 0
        ? (totals.returningVisitors ?? 0) / (totals.visitorsInRange ?? 0)
        : 0,
    countries: geography?.countries ?? 0,
    cities: geography?.cities ?? 0,
    topCountry: topCountry
      ? { code: topCountry.code, name: topCountry.label, visitors: topCountry.visitors }
      : null,
    topCity: topCity
      ? { name: topCity.label, countryName: topCity.countryName, visitors: topCity.visitors }
      : null,
    range: {
      preset: range.preset,
      label: range.label,
      from: range.from ? range.from.toISOString() : null,
      to: range.to.toISOString(),
    },
  };
}

/** Bucketed unique-visitor series; empty buckets are filled in on the server. */
export async function getVisitorsOverTime(
  range: ResolvedDateRange,
  limit = 120,
): Promise<TimeSeriesPoint[]> {
  await getConnection();
  const visitors = await rawCollection();
  const granularity = pickGranularity(range);

  const rows = await visitors
    .aggregate<{ _id: Date; visitors: number }>([
      { $match: humanInRange(range) },
      {
        $group: {
          _id: {
            $dateTrunc: { date: "$lastSeen", unit: GRANULARITY_UNIT[granularity], timezone: "UTC" },
          },
          visitors: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: limit },
    ])
    .toArray();

  if (range.from === null) {
    return rows.map((row) => ({
      key: row._id.toISOString(),
      label: formatBucketLabel(row._id, granularity),
      visitors: row.visitors,
    }));
  }

  const counts = new Map(rows.map((row) => [row._id.getTime(), row.visitors]));
  const points: TimeSeriesPoint[] = [];

  const startMs =
    granularity === "hour" ? HOUR_MS : granularity === "day" ? DAY_MS : 0;

  let cursor =
    startMs > 0
      ? new Date(Math.floor(range.from.getTime() / startMs) * startMs)
      : new Date(Date.UTC(range.from.getUTCFullYear(), range.from.getUTCMonth(), 1));

  while (cursor.getTime() < range.to.getTime() && points.length < limit) {
    points.push({
      key: cursor.toISOString(),
      label: formatBucketLabel(cursor, granularity),
      visitors: counts.get(cursor.getTime()) ?? 0,
    });
    cursor = granularity === "month" ? addUtcMonth(cursor) : new Date(cursor.getTime() + startMs);
  }

  return points;
}

/* -------------------------------------------------------------------------- */
/* Breakdowns                                                                  */
/* -------------------------------------------------------------------------- */

interface RawGroup {
  _id: string | null;
  visitors: number;
}

async function groupByField<T extends RawGroup>(
  range: ResolvedDateRange,
  field: string,
  limit: number,
  extras: Record<string, AccumulatorOperator> = {},
): Promise<T[]> {
  await getConnection();
  const visitors = await rawCollection();

  return visitors
    .aggregate<T>([
      { $match: { $and: [humanInRange(range), { [field]: { $ne: null } }] } },
      { $group: { _id: `$${field}`, visitors: { $sum: 1 }, ...extras } },
      { $sort: { visitors: -1, _id: 1 } },
      { $limit: limit },
    ])
    .toArray();
}

interface CountryGroup extends RawGroup {
  flag: string | null;
  countryName: string | null;
}

/** Top detected countries, sorted descending by visitor count. */
export async function getVisitorsByCountry(
  range: ResolvedDateRange,
  limit = 8,
): Promise<CountryBreakdownItem[]> {
  const rows = await groupByField<CountryGroup>(range, "countryCode", limit, {
    flag: { $first: "$countryFlag" },
    countryName: { $first: "$countryName" },
  });

  const items: CountryBreakdownItem[] = rows.map((row) => ({
    key: row._id ?? "unknown",
    code: row._id,
    label: nullableString(row.countryName) ?? nullableString(row._id) ?? UNKNOWN_LABEL,
    visitors: row.visitors,
    share: 0,
    flag: nullableString(row.flag),
  }));

  return withShare(items, sumVisitors(items));
}

interface CityGroup extends RawGroup {
  countryName: string | null;
}

/** Top detected cities, sorted descending by visitor count. */
export async function getVisitorsByCity(
  range: ResolvedDateRange,
  limit = 8,
): Promise<CityBreakdownItem[]> {
  const rows = await groupByField<CityGroup>(range, "city", limit, {
    countryName: { $first: "$countryName" },
  });

  const items: CityBreakdownItem[] = rows.map((row) => ({
    key: row._id ?? "unknown",
    label: nullableString(row._id) ?? UNKNOWN_LABEL,
    countryName: nullableString(row.countryName),
    visitors: row.visitors,
    share: 0,
  }));

  return withShare(items, sumVisitors(items));
}

/** Most visited pages, based on each visitor's most recent page view. */
export async function getVisitorsByPage(
  range: ResolvedDateRange,
  limit = 8,
): Promise<PageBreakdownItem[]> {
  await getConnection();
  const visitors = await rawCollection();

  const rows = await visitors
    .aggregate<RawGroup>([
      { $match: { $and: [humanInRange(range), { page: { $ne: null } }] } },
      { $group: { _id: "$page", visitors: { $sum: 1 } } },
      { $sort: { visitors: -1, _id: 1 } },
      { $limit: limit },
    ])
    .toArray();

  const items: PageBreakdownItem[] = rows.map((row) => ({
    key: row._id ?? "/",
    path: nullableString(row._id) ?? "/",
    label: nullableString(row._id) ?? "/",
    visitors: row.visitors,
    share: 0,
  }));

  return withShare(items, sumVisitors(items));
}

/** Device / browser / operating-system mix for the selected range. */
export async function getBreakdownByField(
  range: ResolvedDateRange,
  field: "deviceType" | "browser" | "operatingSystem",
  limit = 6,
): Promise<BreakdownItem[]> {
  const rows = await groupByField(range, field, limit);

  const items: BreakdownItem[] = rows.map((row) => ({
    key: row._id ?? "unknown",
    label: nullableString(row._id) ?? UNKNOWN_LABEL,
    visitors: row.visitors,
    share: 0,
  }));

  return withShare(items, sumVisitors(items));
}

/**
 * Traffic sources derived from the last recorded referrer host.
 *
 * Requests without a referrer are grouped as `Direct / Unknown`. Nothing is
 * inferred or invented to fill the gap.
 */
export async function getTrafficSources(
  range: ResolvedDateRange,
  limit = 6,
): Promise<BreakdownItem[]> {
  await getConnection();
  const visitors = await rawCollection();

  const rows = await visitors
    .aggregate<RawGroup>([
      { $match: humanInRange(range) },
      {
        $addFields: {
          referrerHost: {
            $let: {
              vars: {
                found: {
                  $regexFind: {
                    input: { $ifNull: ["$referrer", ""] },
                    regex: "^https?://([^/?#]+)",
                    options: "i",
                  },
                },
              },
              // `captures.0.0` is the first capture group of the first match.
              in: { $ifNull: [{ $arrayElemAt: ["$$found.captures.0", 0] }, null] },
            },
          },
        },
      },
      { $group: { _id: "$referrerHost", visitors: { $sum: 1 } } },
      { $sort: { visitors: -1, _id: 1 } },
      { $limit: limit },
    ])
    .toArray();

  const items: BreakdownItem[] = rows.map((row) => {
    const host = nullableString(row._id)?.toLowerCase() ?? null;
    return {
      key: host ?? "direct",
      label: host ?? "Direct / Unknown",
      visitors: row.visitors,
      share: 0,
    };
  });

  return withShare(items, sumVisitors(items));
}

function sumVisitors(items: BreakdownItem[]): number {
  return items.reduce((sum, item) => sum + item.visitors, 0);
}

/* -------------------------------------------------------------------------- */
/* Visitor lists                                                               */
/* -------------------------------------------------------------------------- */

const LIST_FIELDS = {
  _id: 1,
  ip: 1,
  countryCode: 1,
  countryName: 1,
  countryFlag: 1,
  regionName: 1,
  city: 1,
  isp: 1,
  connectionType: 1,
  deviceType: 1,
  browser: 1,
  operatingSystem: 1,
  timezone: 1,
  page: 1,
  referrer: 1,
  firstSeen: 1,
  lastSeen: 1,
  visitCount: 1,
} as const;

type LeanVisitor = Record<string, unknown>;

function toListItem(row: LeanVisitor): VisitorListItem {
  return {
    id: String(row._id ?? ""),
    ip: String(row.ip ?? ""),
    countryCode: nullableString(row.countryCode),
    countryName: nullableString(row.countryName),
    countryFlag: nullableString(row.countryFlag),
    regionName: nullableString(row.regionName),
    city: nullableString(row.city),
    isp: nullableString(row.isp),
    connectionType: nullableString(row.connectionType),
    deviceType: toDeviceType(row.deviceType),
    browser: nullableString(row.browser),
    operatingSystem: nullableString(row.operatingSystem),
    timezone: nullableString(row.timezone),
    page: nullableString(row.page),
    referrer: nullableString(row.referrer),
    firstSeen: isoDate(row.firstSeen),
    lastSeen: isoDate(row.lastSeen),
    visitCount: typeof row.visitCount === "number" ? row.visitCount : 0,
  };
}

/** Case-insensitive search across IP, country, city, region and ISP. */
function searchMatch(search: string): MatchClause {
  const pattern = new RegExp(escapeRegExp(search), "i");
  return {
    $or: [
      { ip: pattern },
      { countryName: pattern },
      { city: pattern },
      { regionName: pattern },
      { isp: pattern },
    ],
  };
}

/** Combines the date range with the optional facet filters and search term. */
function buildVisitorFilter(query: VisitorQuery): Record<string, unknown> {
  const clauses: MatchClause[] = [humanInRange(query.range)];

  if (query.countryCode) clauses.push({ countryCode: query.countryCode });
  if (query.city) clauses.push({ city: query.city });
  if (query.deviceType) clauses.push({ deviceType: query.deviceType });
  if (query.browser) clauses.push({ browser: query.browser });
  if (query.operatingSystem) clauses.push({ operatingSystem: query.operatingSystem });
  if (query.search) clauses.push(searchMatch(query.search));

  return { $and: clauses };
}

/** Paginated visitor list with server-side search, filtering and sorting. */
export async function getVisitors(query: VisitorQuery): Promise<Paginated<VisitorListItem>> {
  await getConnection();

  const filter = buildVisitorFilter(query);
  const sort: Record<string, 1 | -1> = {
    [query.sort]: query.direction === "asc" ? 1 : -1,
  };

  const [rows, total] = await Promise.all([
    Visitor.find(filter)
      .select(LIST_FIELDS)
      .sort(sort)
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .lean<LeanVisitor[]>()
      .exec(),
    Visitor.countDocuments(filter),
  ]);

  return {
    items: rows.map(toListItem),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/** Full visitor record for the details view. */
export async function getVisitorById(id: string): Promise<VisitorDetail | null> {
  await getConnection();
  if (!isValidObjectId(id)) return null;

  const row = await Visitor.findById(id).lean<LeanVisitor>().exec();
  if (!row) return null;

  return {
    ...toListItem(row),
    ipType: nullableString(row.ipType),
    callingCode: nullableString(row.callingCode),
    regionCode: nullableString(row.regionCode),
    zip: nullableString(row.zip),
    latitude: nullableNumber(row.latitude),
    longitude: nullableNumber(row.longitude),
    timezone: nullableString(row.timezone),
    timezoneOffset: nullableNumber(row.timezoneOffset),
    currencyCode: nullableString(row.currencyCode),
    asn: nullableNumber(row.asn),
    org: nullableString(row.org),
    geolocatedAt: row.geolocatedAt ? isoDate(row.geolocatedAt) : null,
    createdAt: isoDate(row.createdAt),
    updatedAt: isoDate(row.updatedAt),
  };
}

/** Latest activity, newest first. Drives the "Recent visitors" panel. */
export async function getRecentVisitors(limit = 8): Promise<RecentVisitorItem[]> {
  await getConnection();

  const rows = await Visitor.find({})
    .select(LIST_FIELDS)
    .sort({ lastSeen: -1 })
    .limit(limit)
    .lean<LeanVisitor[]>()
    .exec();

  return rows.map((row) => ({
    id: String(row._id ?? ""),
    ip: String(row.ip ?? ""),
    countryCode: nullableString(row.countryCode),
    countryName: nullableString(row.countryName),
    countryFlag: nullableString(row.countryFlag),
    city: nullableString(row.city),
    browser: nullableString(row.browser),
    operatingSystem: nullableString(row.operatingSystem),
    deviceType: toDeviceType(row.deviceType),
    page: nullableString(row.page),
    lastSeen: isoDate(row.lastSeen),
  }));
}

interface FilterOptionFacet {
  countries: { code: string | null; name: string | null }[];
  cities: (string | null)[];
  devices: (string | null)[];
  browsers: (string | null)[];
  operatingSystems: (string | null)[];
}

/** Distinct values that populate the filter dropdowns. */
export async function getVisitorFilterOptions(): Promise<VisitorFilterOptions> {
  await getConnection();
  const visitors = await rawCollection();

  const [result] = await visitors
    .aggregate<FilterOptionFacet>([
      { $match: EXCLUDE_BOTS },
      {
        $group: {
          _id: null,
          countries: { $push: { code: "$countryCode", name: "$countryName" } },
          cities: { $addToSet: "$city" },
          devices: { $addToSet: "$deviceType" },
          browsers: { $addToSet: "$browser" },
          operatingSystems: { $addToSet: "$operatingSystem" },
        },
      },
      {
        $project: {
          _id: 0,
          countries: 1,
          cities: 1,
          devices: 1,
          browsers: 1,
          operatingSystems: 1,
        },
      },
    ])
    .toArray();

  const countryNames = new Map<string, string>();
  for (const entry of result?.countries ?? []) {
    const code = nullableString(entry.code);
    if (code && !countryNames.has(code)) {
      countryNames.set(code, nullableString(entry.name) ?? code);
    }
  }

  return {
    countries: [...countryNames.entries()]
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    cities: sortedDistinct(result?.cities),
    devices: sortedDistinct(result?.devices),
    browsers: sortedDistinct(result?.browsers),
    operatingSystems: sortedDistinct(result?.operatingSystems),
  };
}

function sortedDistinct(values: readonly (string | null)[] | undefined): string[] {
  return (values ?? [])
    .map((value) => nullableString(value))
    .filter((value): value is string => value !== null)
    .sort((a, b) => a.localeCompare(b));
}

/* -------------------------------------------------------------------------- */
/* Export                                                                      */
/* -------------------------------------------------------------------------- */

/** Flattens the current filter into CSV-ready rows. */
export async function getVisitorExportRows(query: VisitorQuery): Promise<VisitorExportRow[]> {
  await getConnection();

  const rows = await Visitor.find(buildVisitorFilter(query))
    .select(LIST_FIELDS)
    .sort({ lastSeen: -1 })
    .limit(EXPORT_ROW_LIMIT)
    .lean<LeanVisitor[]>()
    .exec();

  return rows.map((row) => ({
    ip: String(row.ip ?? ""),
    country: nullableString(row.countryName) ?? "",
    region: nullableString(row.regionName) ?? "",
    city: nullableString(row.city) ?? "",
    isp: nullableString(row.isp) ?? "",
    device: nullableString(row.deviceType) ?? "",
    browser: nullableString(row.browser) ?? "",
    os: nullableString(row.operatingSystem) ?? "",
    firstSeen: isoDate(row.firstSeen),
    lastSeen: isoDate(row.lastSeen),
    visits: typeof row.visitCount === "number" ? row.visitCount : 0,
  }));
}

/* -------------------------------------------------------------------------- */
/* Retention                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Deletes visitor documents whose `lastSeen` predates the retention window.
 *
 * Intended for a scheduled job (cron / platform scheduler). The dashboard never
 * calls this implicitly — see the README for the rationale.
 */
export async function purgeExpiredVisitors(cutoff: Date): Promise<number> {
  await getConnection();
  const result = await Visitor.deleteMany({ lastSeen: { $lt: cutoff } });
  return result.deletedCount ?? 0;
}
