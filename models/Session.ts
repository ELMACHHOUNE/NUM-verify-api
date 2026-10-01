import "server-only";

import mongoose, { Schema } from "mongoose";

/**
 * Revocable login sessions.
 *
 * The cookie holds a random opaque token; only its SHA-256 digest is stored here.
 * Keeping sessions server-side is what makes "sign out everywhere", admin
 * deactivation and forced re-authentication possible — none of which a purely
 * self-contained signed token can offer.
 */

export interface SessionRecord {
  /** Mongoose adds this automatically; typed here so lean results expose it. */
  _id: mongoose.Types.ObjectId;
  /** SHA-256 digest of the cookie token. Never the token itself. */
  tokenHash: string;
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  lastSeenAt: Date;
  /** Best-effort client fingerprint for the "active sessions" list. */
  userAgent: string | null;
  ip: string | null;
}

const SessionSchema = new Schema<SessionRecord>(
  {
    tokenHash: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // No `index: true` here — the TTL index is declared below, and declaring both
    // makes Mongoose discard the `expireAfterSeconds` option.
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date, default: () => new Date() },
    userAgent: { type: String, default: null, maxlength: 256 },
    ip: { type: String, default: null, maxlength: 64 },
  },
  { versionKey: false, timestamps: { createdAt: true, updatedAt: false } },
);

// Mongo removes expired sessions on its own once a TTL index exists.
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session =
  (mongoose.models.Session as mongoose.Model<SessionRecord> | undefined) ??
  mongoose.model<SessionRecord>("Session", SessionSchema);