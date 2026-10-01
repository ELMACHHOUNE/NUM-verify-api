/**
 * Admin authentication types.
 *
 * InsightHub ships a single-operator admin area protected by a shared secret
 * (`ADMIN_SECRET`) exchanged for an HMAC-signed, httpOnly session cookie. The
 * check happens on the server only — there is no client-side password gate.
 */

export interface AdminSession {
  /** Epoch milliseconds when the session expires. */
  expiresAt: number;
  /** Opaque per-login identifier; useful for log correlation, not authorization. */
  sessionId: string;
}

export interface AdminLoginPayload {
  password: string;
}

export const ADMIN_ERROR_CODES = [
  "INVALID_REQUEST",
  "NOT_CONFIGURED",
  "INVALID_CREDENTIALS",
  "RATE_LIMITED",
  "UNAUTHORIZED",
  "INTERNAL_ERROR",
] as const;

export type AdminErrorCode = (typeof ADMIN_ERROR_CODES)[number];

export interface AdminLoginSuccessResponse {
  success: true;
  expiresAt: string;
}

export interface AdminErrorResponse {
  success: false;
  error: string;
  code: AdminErrorCode;
}

export type AdminAuthResponse = AdminLoginSuccessResponse | AdminErrorResponse;

export interface AdminSessionResponse {
  authenticated: boolean;
  expiresAt: string | null;
  authConfigured: boolean;
}
