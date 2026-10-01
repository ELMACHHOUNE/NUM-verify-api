import "server-only";

import mongoose, { Schema } from "mongoose";

import { DEVICE_TYPES } from "@/types/analytics";

/**
 * The single analytics collection.
 *
 * One document per visitor IP. The document is intentionally denormalized so
 * every dashboard card, table row and chart can be served by a MongoDB
 * aggregation pipeline instead of loading the collection into memory.
 *
 * Privacy: only technical signals required for analytics are stored. No names,
 * e-mail addresses, phone numbers, form contents or exact street addresses are
 * captured, and the raw `User-Agent` is not persisted — only the parsed
 * `deviceType` / `browser` / `operatingSystem` triple.
 */

export interface VisitorRecord {
  ip: string;
  ipType?: string | null;

  countryCode?: string | null;
  countryName?: string | null;
  countryFlag?: string | null;
  callingCode?: string | null;
  isEu?: boolean | null;

  regionCode?: string | null;
  regionName?: string | null;

  city?: string | null;
  zip?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  timezone?: string | null;
  timezoneCode?: string | null;
  timezoneOffset?: number | null;

  currencyCode?: string | null;

  asn?: number | null;
  isp?: string | null;
  org?: string | null;
  connectionType?: string | null;

  deviceType?: string | null;
  browser?: string | null;
  operatingSystem?: string | null;

  referrer?: string | null;
  page?: string | null;

  /** When the geolocation snapshot attached to this visitor was fetched. */
  geolocatedAt?: Date | null;

  firstSeen: Date;
  lastSeen: Date;
  visitCount: number;

  createdAt: Date;
  updatedAt: Date;
}

const VisitorSchema = new Schema<VisitorRecord>(
  {
    ip: { type: String, required: true },

    ipType: { type: String, default: null },

    countryCode: { type: String, default: null },
    countryName: { type: String, default: null },
    countryFlag: { type: String, default: null },
    callingCode: { type: String, default: null },
    isEu: { type: Boolean, default: null },

    regionCode: { type: String, default: null },
    regionName: { type: String, default: null },

    city: { type: String, default: null },
    zip: { type: String, default: null },

    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },

    timezone: { type: String, default: null },
    timezoneCode: { type: String, default: null },
    timezoneOffset: { type: Number, default: null },

    currencyCode: { type: String, default: null },

    asn: { type: Number, default: null },
    isp: { type: String, default: null },
    org: { type: String, default: null },
    connectionType: { type: String, default: null },

    deviceType: { type: String, enum: [...DEVICE_TYPES], default: null },
    browser: { type: String, default: null },
    operatingSystem: { type: String, default: null },

    referrer: { type: String, default: null },
    page: { type: String, default: null },

    geolocatedAt: { type: Date, default: null },

    firstSeen: { type: Date, required: true, default: () => new Date() },
    lastSeen: { type: Date, required: true, default: () => new Date() },
    // No schema default: the tracking pipeline always uses `$inc`, which creates
    // the field as `1` on insert and avoids a `$setOnInsert` / `$inc` conflict.
    visitCount: { type: Number, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: false,
  },
);

// One record per visitor IP; also the primary lookup path for tracking.
VisitorSchema.index({ ip: 1 }, { unique: true, name: "ip_unique" });
// Range scans, "active now" and the visitors table default sort.
VisitorSchema.index({ lastSeen: -1 }, { name: "last_seen_desc" });
VisitorSchema.index({ firstSeen: -1 }, { name: "first_seen_desc" });
// Filtered tables and geography breakdowns.
VisitorSchema.index({ countryCode: 1, lastSeen: -1 }, { name: "country_last_seen" });
VisitorSchema.index({ city: 1, lastSeen: -1 }, { name: "city_last_seen" });

export const Visitor =
  (mongoose.models.Visitor as mongoose.Model<VisitorRecord> | undefined) ??
  mongoose.model<VisitorRecord>("Visitor", VisitorSchema);
