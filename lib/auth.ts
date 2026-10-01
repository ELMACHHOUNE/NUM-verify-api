import "server-only";

import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";

import { getConnection } from "@/lib/mongodb";
import { Session, type SessionRecord } from "@/models/Session";
import { User, type UserRecord } from "@/models/User";
import type { PublicUser, UserRole } from "@/types/auth";

/**
 * Account authentication and session management.
 *
 * - Passwords are hashed with scrypt (memory-hard, no native dependency) and
 *   compared with `timingSafeEqual`.
 * - Sessions are opaque random tokens stored hashed in MongoDB, so they can be
 *   revoked server-side. The cookie never contains user data.
 * - `ADMIN_SECRET` is no longer an authentication factor; it is retained only as
 *   the HMAC pepper used to derive session token digests, which means a database
 *   leak alone cannot be used to forge a valid cookie.
 *
 * Server-only: this module reads `process.env`, cookies and the database.
 */

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

// scrypt cost parameters. N=16384 is ~16MB of memory per hash, which is a
// meaningful rate limit for an attacker and cheap enough for sign-in.
const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;

const SESSION_COOKIE = "insighthub_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Keep a session alive in the database only while the browser keeps using it.
const SESSION_TOUCH_INTERVAL_MS = 15 * 60 * 1000;

export class AuthError extends Error {
  constructor(
    readonly code:
      | "INVALID_CREDENTIALS"
      | "EMAIL_TAKEN"
      | "ACCOUNT_DISABLED"
      | "NOT_CONFIGURED",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/* -------------------------------------------------------------------------- */
/* Passwords                                                                    */
/* -------------------------------------------------------------------------- */

/** Hashes a password as `scrypt$<saltHex>$<hashHex>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const derived = await scrypt(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/**
 * Verifies a password against a stored hash.
 *
 * Returns `false` for malformed hashes instead of throwing, so a corrupted row
 * denies access rather than crashing the sign-in route.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");

  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  if (salt.length === 0 || expected.length === 0) return false;

  const derived = await scrypt(password, salt, expected.length);
  return timingSafeEqual(derived, expected);
}

/* -------------------------------------------------------------------------- */
/* Session tokens                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Secret used to derive session digests.
 *
 * Falling back to a process-lifetime random value keeps local development
 * working without configuration; production deployments must set
 * `ADMIN_SECRET`, otherwise every restart invalidates open sessions.
 */
const FALLBACK_PEPPER = randomBytes(32).toString("hex");

function pepper(): string {
  const configured = process.env.ADMIN_SECRET?.trim();
  return configured && configured.length > 0 ? configured : FALLBACK_PEPPER;
}

/** Whether a stable server-side pepper is configured. */
export function isAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_SECRET?.trim());
}

/**
 * SHA-256 of the raw token, keyed with the server pepper.
 *
 * Keying means the stored digest is useless on its own, so a leaked database
 * dump cannot be turned into working cookies.
 */
function digestToken(token: string): string {
  return createHmac("sha256", pepper()).update(token).digest("hex");
}

/* -------------------------------------------------------------------------- */
/* User records                                                                 */
/* -------------------------------------------------------------------------- */

export function toPublicUser(row: UserRecord): PublicUser {
  return {
    id: String(row._id ?? ""),
    email: row.email,
    name: row.name,
    role: (row.role as UserRole) ?? "user",
    isActive: row.isActive !== false,
    createdAt: new Date(row.createdAt).toISOString(),
    lastLoginAt: row.lastLoginAt ? new Date(row.lastLoginAt).toISOString() : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Registration / credentials                                                   */
/* -------------------------------------------------------------------------- */

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  await getConnection();
  const normalized = email.trim().toLowerCase();
  return User.findOne({ emailNormalized: normalized })
    .select("+passwordHash")
    .lean<UserRecord>()
    .exec();
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  await getConnection();
  return User.findById(id).lean<UserRecord>().exec();
}

/**
 * Creates an account.
 *
 * The caller decides the role; registration routes must never let a client
 * choose `admin` for itself.
 */
export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  role: UserRole;
}): Promise<PublicUser> {
  await getConnection();
  const email = input.email.trim();
  const emailNormalized = email.toLowerCase();
  const passwordHash = await hashPassword(input.password);

  try {
    const created = await User.create({
      email,
      emailNormalized,
      name: input.name.trim(),
      passwordHash,
      role: input.role,
      isActive: true,
    });

    return toPublicUser(created.toObject() as UserRecord);
  } catch (error) {
    // Surface the unique-index violation as a domain error rather than a 500.
    if (isDuplicateKeyError(error)) {
      throw new AuthError("EMAIL_TAKEN", "An account with that email already exists.");
    }
    throw error;
  }
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<{ user: UserRecord }> {
  const row = await findUserByEmail(email);

  // Always run a verification, even for an unknown address, so a missing account
  // and a wrong password cost the same. That leaves no timing signal to
  // enumerate registered emails with.
  const passwordMatches = await verifyPassword(password, row?.passwordHash ?? (await dummyHash()));

  if (!row || !passwordMatches) {
    throw new AuthError("INVALID_CREDENTIALS", "Incorrect email or password.");
  }

  if (row.isActive === false) {
    throw new AuthError("ACCOUNT_DISABLED", "This account has been deactivated.");
  }

  return { user: row };
}

/**
 * A throwaway hash used to equalise timing when no account matches.
 *
 * Computed once per process and cached as the promise itself, so concurrent
 * sign-ins cannot kick off several extra scrypt operations.
 */
let cachedDummyHash: Promise<string> | null = null;

function dummyHash(): Promise<string> {
  cachedDummyHash ??= hashPassword("insighthub-timing-equaliser");
  return cachedDummyHash;
}

export async function markLogin(userId: string): Promise<void> {
  await getConnection();
  await User.updateOne({ _id: userId }, { $set: { lastLoginAt: new Date() } }).exec();
}

/* -------------------------------------------------------------------------- */
/* Sessions                                                                     */
/* -------------------------------------------------------------------------- */

/** Creates a session row and returns the raw token to put in the cookie. */
export async function issueSession(userId: string, meta?: {
  userAgent?: string | null;
  ip?: string | null;
}): Promise<{ token: string; expiresAt: number }> {
  await getConnection();

  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;

  await Session.create({
    tokenHash: digestToken(token),
    userId,
    expiresAt: new Date(expiresAt),
    userAgent: meta?.userAgent?.slice(0, 256) ?? null,
    ip: meta?.ip ?? null,
  });

  return { token, expiresAt };
}

/**
 * Resolves the current session to a live account.
 *
 * Returns `null` for an absent, unknown, expired or revoked token, and also for
 * a session whose account has since been deactivated.
 */
export async function getCurrentSession(): Promise<{
  token: string;
  user: PublicUser;
} | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  await getConnection();

  const session = await Session.findOne({
    tokenHash: digestToken(token),
    expiresAt: { $gt: new Date() },
  })
    .lean<SessionRecord>()
    .exec();

  if (!session) return null;

  const user = await User.findById(session.userId).lean<UserRecord>().exec();
  if (!user || user.isActive === false) return null;

  // Throttle writes: touching every request would hammer the collection for no
  // practical benefit.
  if (Date.now() - new Date(session.lastSeenAt).getTime() > SESSION_TOUCH_INTERVAL_MS) {
    await Session.updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } }).exec();
  }

  return { token, user: toPublicUser(user) };
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getCurrentSession()) !== null;
}

export async function isAdmin(): Promise<boolean> {
  const session = await getCurrentSession();
  return session?.user.role === "admin";
}

/** Writes the session cookie. Only valid in a Server Action or Route Handler. */
export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Clears the cookie and deletes the underlying session row. */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await getConnection();
    await Session.deleteOne({ tokenHash: digestToken(token) }).exec();
  }

  store.delete(SESSION_COOKIE);
}

/** Revokes every session for a user — used when deactivating or deleting one. */
export async function revokeAllSessions(userId: string): Promise<number> {
  await getConnection();
  const result = await Session.deleteMany({ userId }).exec();
  return result.deletedCount ?? 0;
}

/** Deletes expired session rows. Safe to call from a scheduled job. */
export async function pruneExpiredSessions(): Promise<number> {
  await getConnection();
  const result = await Session.deleteMany({ expiresAt: { $lte: new Date() } }).exec();
  return result.deletedCount ?? 0;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                      */
/* -------------------------------------------------------------------------- */

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

export { SESSION_COOKIE };