/**
 * Date-range helpers for the analytics dashboard.
 *
 * All buckets and boundaries are computed in **UTC**. That keeps aggregation
 * pipelines, date filters and the charts consistent regardless of where the
 * server runs, at the cost of "today" meaning "today in UTC". The UI labels the
 * period so this is never ambiguous.
 */

import {
  DATE_RANGE_PRESETS,
  type DateRangePreset,
  type ResolvedDateRange,
  type TimeSeriesGranularity,
} from "@/types/analytics";

export const PRESET_LABELS: Record<DateRangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 days",
  last30: "Last 30 days",
  thisYear: "This year",
  allTime: "All time",
  custom: "Custom",
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function startOfUtcYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

/** Half-open end boundary: the first millisecond *after* the current instant. */
function endOfNow(): Date {
  return new Date(Date.now() + 1);
}

function isPreset(value: unknown): value is DateRangePreset {
  return (
    typeof value === "string" && (DATE_RANGE_PRESETS as readonly string[]).includes(value)
  );
}

function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  // `<input type="date">` yields `YYYY-MM-DD`; `new Date()` would treat it as
  // UTC midnight already, but be explicit so behaviour is unambiguous.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (match) {
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Turns a preset (plus optional custom bounds) into a concrete range.
 *
 * `from` is inclusive, `to` is exclusive. `allTime` yields a `null` lower bound
 * so queries can skip the lower bound entirely.
 */
export function resolveDateRange(
  preset: string | null | undefined,
  from?: string | null,
  to?: string | null,
): ResolvedDateRange {
  const now = new Date();
  const today = startOfUtcDay(now);
  const resolvedPreset: DateRangePreset = isPreset(preset) ? preset : "last7";

  switch (resolvedPreset) {
    case "today":
      return {
        from: today,
        to: endOfNow(),
        preset: "today",
        label: PRESET_LABELS.today,
      };
    case "yesterday":
      return {
        from: addUtcDays(today, -1),
        to: today,
        preset: "yesterday",
        label: PRESET_LABELS.yesterday,
      };
    case "last30":
      return {
        from: addUtcDays(today, -29),
        to: endOfNow(),
        preset: "last30",
        label: PRESET_LABELS.last30,
      };
    case "thisYear":
      return {
        from: startOfUtcYear(now),
        to: endOfNow(),
        preset: "thisYear",
        label: PRESET_LABELS.thisYear,
      };
    case "allTime":
      return { from: null, to: endOfNow(), preset: "allTime", label: PRESET_LABELS.allTime };
    case "custom": {
      const parsedFrom = parseDateInput(from) ?? addUtcDays(today, -6);
      const parsedTo = parseDateInput(to) ?? today;
      // Treat the end date as inclusive of that whole day.
      const exclusiveTo =
        parsedTo.getTime() < startOfUtcDay(now).getTime()
          ? addUtcDays(startOfUtcDay(parsedTo), 1)
          : endOfNow();

      return {
        from: parsedFrom,
        to: exclusiveTo,
        preset: "custom",
        label: `${parsedFrom.toISOString().slice(0, 10)} → ${parsedTo
          .toISOString()
          .slice(0, 10)}`,
      };
    }
    case "last7":
    default:
      return {
        from: addUtcDays(today, -6),
        to: endOfNow(),
        preset: "last7",
        label: PRESET_LABELS.last7,
      };
  }
}

/** Picks a bucket size that keeps a series under ~120 points. */
export function pickGranularity(range: ResolvedDateRange): TimeSeriesGranularity {
  if (range.from === null) return "month";

  const spanDays = Math.ceil((range.to.getTime() - range.from.getTime()) / DAY_MS);
  if (spanDays <= 2) return "hour";
  if (spanDays <= 120) return "day";
  return "month";
}

/** `$dateTrunc` unit for the chosen granularity. */
export const GRANULARITY_UNIT: Record<TimeSeriesGranularity, string> = {
  hour: "hour",
  day: "day",
  month: "month",
};

const BUCKET_LABEL_FORMATTERS: Record<TimeSeriesGranularity, Intl.DateTimeFormat> = {
  hour: new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }),
  day: new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }),
  month: new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }),
};

/** Formats a bucket start for chart axes and tooltips. */
export function formatBucketLabel(
  bucketStart: Date,
  granularity: TimeSeriesGranularity,
): string {
  return BUCKET_LABEL_FORMATTERS[granularity].format(bucketStart);
}

/** Start-of-day boundary used by the "visits today" metric. */
export function startOfTodayUtc(): Date {
  return startOfUtcDay(new Date());
}
