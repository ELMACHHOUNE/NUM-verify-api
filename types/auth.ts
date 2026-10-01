/**
 * Authentication and account types.
 *
 * InsightHub uses real accounts in MongoDB with two roles:
 *
 * - `admin` — full access to `/admin`, including analytics and user management.
 * - `user`  — may sign in and manage their own account, but sees no analytics.
 *
 * Passwords are hashed with scrypt; sessions are revocable records in MongoDB
 * rather than self-contained tokens, so an admin can terminate every session of
 * an account. Every check happens on the server.
 */

export const USER_ROLES = ["admin", "user"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

/** Row rendered in the admin user-management table. */
export interface AdminUserRow extends PublicUser {
  sessionCount: number;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: number;
}

export const AUTH_ERROR_CODES = [
  "INVALID_REQUEST",
  "NOT_CONFIGURED",
  "INVALID_CREDENTIALS",
  "EMAIL_TAKEN",
  "ACCOUNT_DISABLED",
  "RATE_LIMITED",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "LAST_ADMIN",
  "INTERNAL_ERROR",
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

export interface AuthErrorResponse {
  success: false;
  error: string;
  code: AuthErrorCode;
}

export interface AuthSuccessResponse {
  success: true;
  user: PublicUser;
  expiresAt: string;
}

export type AuthResponse = AuthSuccessResponse | AuthErrorResponse;

export interface SessionProbeResponse {
  success: true;
  authenticated: boolean;
  user: PublicUser | null;
}