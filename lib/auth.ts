import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import type { AdminErrorCode, AdminSession } from "@/types/admin";

/**
 * Single-operator admin authentication.
 *
 * A shared secret (`ADMIN_SECRET`) is exchanged for an HMAC-SHA256 signed,
 * `httpOnly`, `SameSite=Lax` session cookie. The password is never compared on
 * the client, never logged, and no key material is embedded in the cookie — the
 * cookie only carries an expiry plus an opaque session id, both covered by the
 * signature.
 *
 * Server-only: this module reads `process.env` and Node's crypto API.
 */

const COOKIE_NAME = "insighthub_admin";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours
const SESSION_VERSION = "v1";

export const ADMIN_ERROR_MESSAGES = {
  INVALID_REQUEST: "Enter the admin password.",
  NOT_CONFIGURED:
    "Admin access is not configured. Set ADMIN_SECRET before signing in.",
  INVALID_CREDENTIALS: "Incorrect password.",
  RATE_LIMITED: "Too many sign-in attempts. Please wait a few minutes.",
  UNAUTHORIZED: "Authentication required.",
  INTERNAL_ERROR: "Sign-in failed. Please try again.",
} as const satisfies Record<AdminErrorCode, string>;

export class AuthError extends Error {
  readonly code: AdminErrorCode;

  constructor(code: AdminErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

/** Whether an admin secret is present, without validating a request. */
export function isAuthConfigured(): boolean {
  return Boolean(getSecretOrNull());
}

function getSecretOrNull(): string | null {
  const secret = process.env.ADMIN_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
}

function getSecret(): string {
  const secret = getSecretOrNull();
  if (!secret) {
    throw new AuthError("NOT_CONFIGURED", ADMIN_ERROR_MESSAGES.NOT_CONFIGURED);
  }
  return secret;
}

/** Constant-time string comparison that does not leak length through timing. */
function safeEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

/** Validates a submitted password against `ADMIN_SECRET` in constant time. */
export function verifyAdminPassword(candidate: string): boolean {
  const secret = getSecret();
  return safeEqual(candidate, secret);
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

/** Mints a signed session token: `<version>.<expiresAt>.<sessionId>.<signature>`. */
export function createSessionToken(now: number = Date.now()): string {
  const expiresAt = now + SESSION_MAX_AGE_SECONDS * 1000;
  const sessionId = randomBytes(9).toString("base64url");
  const payload = `${SESSION_VERSION}.${expiresAt}.${sessionId}`;

  return `${payload}.${sign(payload)}`;
}

/** Verifies signature and expiry. Returns `null` for any tampering or staleness. */
export function verifySessionToken(
  token: string | undefined | null,
  now: number = Date.now(),
): AdminSession | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 4) return null;

  const [version, expiresAtRaw, sessionId, signature] = parts;
  if (version !== SESSION_VERSION || !sessionId || !signature) return null;

  let expiresAt: number;
  try {
    expiresAt = Number.parseInt(expiresAtRaw, 10);
  } catch {
    return null;
  }
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return null;

  if (!safeEqual(signature, sign(`${version}.${expiresAtRaw}.${sessionId}`))) return null;

  return { expiresAt, sessionId };
}

/** Reads and validates the session cookie for the current request. */
export async function getAdminSession(): Promise<AdminSession | null> {
  if (!isAuthConfigured()) return null;

  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
}

/** Convenience predicate for pages and route handlers. */
export async function isAdminAuthenticated(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

/** Writes the signed session cookie. Must run in a Server Action or Route Handler. */
export async function setAdminSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Removes the session cookie. */
export async function clearAdminSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
