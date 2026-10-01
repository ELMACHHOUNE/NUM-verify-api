import "server-only";

import mongoose, { Schema } from "mongoose";

import { ACTIVE_WINDOW_OPTIONS, RETENTION_OPTIONS } from "@/types/analytics";

/**
 * Singleton document holding the admin-adjustable analytics settings.
 *
 * One collection, one document (the first match wins, upserted on write), so
 * the settings page stays as simple as a key/value store without inventing a
 * second architecture.
 */

export interface AppSettingRecord {
  visitorTracking: boolean;
  trackPageViews: boolean;
  trackReferrer: boolean;
  dataRetentionDays: number;
  activeWindowMinutes: number;
  updatedAt: Date;
}

const AppSettingSchema = new Schema<AppSettingRecord>(
  {
    visitorTracking: { type: Boolean, default: true },
    trackPageViews: { type: Boolean, default: true },
    trackReferrer: { type: Boolean, default: true },
    dataRetentionDays: {
      type: Number,
      enum: [...RETENTION_OPTIONS],
      default: 90,
    },
    activeWindowMinutes: {
      type: Number,
      enum: [...ACTIVE_WINDOW_OPTIONS],
      default: 5,
    },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false, minimize: false },
);

export const AppSetting =
  (mongoose.models.AppSetting as mongoose.Model<AppSettingRecord> | undefined) ??
  mongoose.model<AppSettingRecord>("AppSetting", AppSettingSchema);

/** Reads the settings document, or `null` when it has never been written. */
export async function readAppSettings(): Promise<AppSettingRecord | null> {
  return AppSetting.findOne({}).lean<AppSettingRecord>().exec();
}

/** Upserts the settings document. */
export async function writeAppSettings(patch: Partial<AppSettingRecord>): Promise<void> {
  await AppSetting.updateOne(
    {},
    { $set: { ...patch, updatedAt: new Date() } },
    { upsert: true },
  ).exec();
}
