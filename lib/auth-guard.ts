import "server-only";

import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import type { AuthErrorCode, PublicUser, UserRole } from "@/types/auth";

/**
 * Server-side guards for the protected surface.
 *
 * These are the only thing standing between an anonymous caller and visitor
 * data, so they live in one place and are applied by every handler rather than
 * being re-implemented per route.
 */

const STATUS_BY_CODE: Record<AuthErrorCode, number> = {
  INVALID_REQUEST: 400,
  NOT_CONFIGURED: 503,
  INVALID_CREDENTIALS: 401,
  EMAIL_TAKEN: 409,
  ACCOUNT_DISABLED: 403,
  RATE_LIMITED: 429,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  LAST_ADMIN: 409,
  INTERNAL_ERROR: 500,
};

const MESSAGES: Record<AuthErrorCode, string> = {
  INVALID_REQUEST: "Invalid request.",
  NOT_CONFIGURED: "Authentication is not configured.",
  INVALID_CREDENTIALS: "Incorrect email or password.",
  EMAIL_TAKEN: "An account with that email already exists.",
  ACCOUNT_DISABLED: "This account has been deactivated.",
  RATE_LIMITED: "Too many requests. Please try again later.",
  UNAUTHENTICATED: "Sign in to continue.",
  FORBIDDEN: "You do not have access to this resource.",
  LAST_ADMIN: "At least one active administrator must remain.",
  INTERNAL_ERROR: "Something went wrong.",
};

/** Authenticated responses and visitor data must never be cached. */
export const NO_STORE = { "Cache-Control": "no-store" } as const;

export function authError(
  code: AuthErrorCode,
  extraHeaders: Record<string, string> = {},
): NextResponse {
  return NextResponse.json(
    { success: false, error: MESSAGES[code], code },
    { status: STATUS_BY_CODE[code], headers: { ...NO_STORE, ...extraHeaders } },
  );
}

export function authJson<T>(payload: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(payload, {
    ...init,
    headers: { ...NO_STORE, ...(init?.headers as Record<string, string> | undefined) },
  });
}

export interface AuthorizedUser {
  user: PublicUser;
}

/**
 * Returns the signed-in user, or a ready-to-send error response.
 *
 * `requireUser` guards any authenticated area; `requireAdmin` additionally
 * checks the role, which is what protects `/admin`.
 */
export async function requireUser(): Promise<AuthorizedUser | NextResponse> {
  const session = await getCurrentSession();
  if (!session) return authError("UNAUTHENTICATED");
  return { user: session.user };
}

export async function requireAdmin(): Promise<AuthorizedUser | NextResponse> {
  const session = await getCurrentSession();
  if (!session) return authError("UNAUTHENTICATED");
  if (session.user.role !== "admin") return authError("FORBIDDEN");
  return { user: session.user };
}

/** Narrows an authorized result, returning `null` when it is an error response. */
export function authorized(
  result: AuthorizedUser | NextResponse,
): AuthorizedUser | null {
  return result instanceof NextResponse ? null : result;
}

export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export type { UserRole };