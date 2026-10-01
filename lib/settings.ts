import "server-only";

import { cache } from "react";

import { readAppSettings, writeAppSettings } from "@/models/AppSetting";
import { DatabaseError } from "@/lib/mongodb";
import type { ActiveWindowMinutes, AppSettings, RetentionDays } from "@/types/analytics";

/**
 * Analytics settings with safe fallbacks.
 *
 * Reads are de-duplicated per React request via `cache()`, and every failure
 * degrades to the documented defaults instead of throwing — the dashboard must
 * keep working even when MongoDB is unreachable.
 */

export const DEFAULT_SETTINGS: AppSettings = {
  visitorTracking: true,
  trackPageViews: true,
  trackReferrer: true,
  dataRetentionDays: 90,
  activeWindowMinutes: 5,
  updatedAt: null,
};

/** Milliseconds in each selectable active-visitor window. */
export const ACTIVE_WINDOW_MS: Record<ActiveWindowMinutes, number> = {
  1: 60_000,
  5: 5 * 60_000,
  15: 15 * 60_000,
  30: 30 * 60_000,
};

/**
 * Loads the settings document, falling back to {@link DEFAULT_SETTINGS} when the
 * database is unavailable or the document does not exist yet.
 */
export const getSettings = cache(async (): Promise<AppSettings> => {
  try {
    const record = await readAppSettings();
    if (!record) return DEFAULT_SETTINGS;

    return {
      visitorTracking: record.visitorTracking ?? DEFAULT_SETTINGS.visitorTracking,
      trackPageViews: record.trackPageViews ?? DEFAULT_SETTINGS.trackPageViews,
      trackReferrer: record.trackReferrer ?? DEFAULT_SETTINGS.trackReferrer,
      dataRetentionDays: (record.dataRetentionDays ??
        DEFAULT_SETTINGS.dataRetentionDays) as RetentionDays,
      activeWindowMinutes: (record.activeWindowMinutes ??
        DEFAULT_SETTINGS.activeWindowMinutes) as ActiveWindowMinutes,
      updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : null,
    };
  } catch (error) {
    if (!(error instanceof DatabaseError)) {
      console.error("[settings] Unable to read settings", error);
    }
    return DEFAULT_SETTINGS;
  }
});

/** Persists a validated settings patch. */
export async function saveSettings(patch: {
  visitorTracking: boolean;
  trackPageViews: boolean;
  trackReferrer: boolean;
  dataRetentionDays: RetentionDays;
  activeWindowMinutes: ActiveWindowMinutes;
}): Promise<AppSettings> {
  await writeAppSettings(patch);

  return { ...patch, updatedAt: new Date().toISOString() };
}

/** Cut-off for the retention window; used by the (optional) cleanup job. */
export function retentionCutoff(retentionDays: RetentionDays): Date {
  return new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
}
