import "server-only";

import mongoose, { Schema } from "mongoose";

import { USER_ROLES } from "@/types/auth";

/**
 * Application accounts.
 *
 * Only technical credential material is stored: an scrypt hash and its salt.
 * The plaintext password never leaves the request that created the account, and
 * `passwordHash` is excluded from queries by default so it cannot leak into an
 * admin listing by accident.
 */

export interface UserRecord {
  /** Mongoose adds this automatically; typed here so lean results expose it. */
  _id: mongoose.Types.ObjectId;
  email: string;
  /** Lowercased, trimmed email used for lookups and uniqueness. */
  emailNormalized: string;
  name: string;
  passwordHash: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserRecord>(
  {
    email: { type: String, required: true, trim: true, maxlength: 254 },
    // Declared once, below, as a unique index. Adding `index: true` here as well
    // makes Mongoose drop the duplicate and silently skip the `unique` option.
    emailNormalized: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: [...USER_ROLES], default: "user", index: true },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date, default: null },
  },
  {
    versionKey: false,
    timestamps: true,
    // `_id` is the only thing an operator should ever need to look up; keeping
    // the projection minimal also keeps accidental password exposure impossible.
    toJSON: { transform: (_doc, ret: Record<string, unknown>) => { delete ret.passwordHash; } },
  },
);

// One account per address. `unique` is an index-level guarantee, so two
// simultaneous registrations cannot both succeed.
UserSchema.index({ emailNormalized: 1 }, { unique: true });

export const User =
  (mongoose.models.User as mongoose.Model<UserRecord> | undefined) ??
  mongoose.model<UserRecord>("User", UserSchema);