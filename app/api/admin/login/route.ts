import { NextResponse } from "next/server";

import {
  ADMIN_ERROR_MESSAGES,
  AuthError,
  createSessionToken,
  isAuthConfigured,
  setAdminSessionCookie,
  verifyAdminPassword,
  verifySessionToken,
} from "@/lib/auth";
import { checkRateLimitWithRule, getClientKey, LOGIN_LIMIT } from "@/lib/rate-limit";
import { adminLoginSchema } from "@/lib/validations";
import type { AdminAuthResponse } from "@/types/admin";

/**
 * Admin sign-in.
 *
 * Compares the submitted password against `ADMIN_SECRET` in constant time, then
 * mints an HMAC-signed, httpOnly session cookie. Rate limiting is per-IP on a
 * 15-minute window to slow credential stuffing.
 */

const MAX_BODY_BYTES = 4_096;
const NO_STORE = { "Cache-Control": "no-store" } as const;

const STATUS_BY_CODE = {
  INVALID_REQUEST: 400,
  NOT_CONFIGURED: 503,
  INVALID_CREDENTIALS: 401,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
} as const;

function failure(
  code: keyof typeof STATUS_BY_CODE,
  extraHeaders: Record<string, string> = {},
): NextResponse<AdminAuthResponse> {
  return NextResponse.json(
    { success: false, error: ADMIN_ERROR_MESSAGES[code], code },
    { status: STATUS_BY_CODE[code], headers: { ...NO_STORE, ...extraHeaders } },
  );
}

export async function POST(request: Request): Promise<Response> {
  const { limited, retryAfterSeconds } = checkRateLimitWithRule(getClientKey(request), LOGIN_LIMIT);
  if (limited) {
    return failure("RATE_LIMITED", { "Retry-After": String(retryAfterSeconds) });
  }

  if (!isAuthConfigured()) {
    return failure("NOT_CONFIGURED");
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return failure("INVALID_REQUEST");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure("INVALID_REQUEST");
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return failure("INVALID_REQUEST");
  }

  let authenticated: boolean;
  try {
    authenticated = verifyAdminPassword(parsed.data.password);
  } catch (error) {
    if (error instanceof AuthError) return failure("NOT_CONFIGURED");
    console.error("[admin/login] Unexpected failure", error);
    return failure("INTERNAL_ERROR");
  }

  if (!authenticated) {
    return failure("INVALID_CREDENTIALS");
  }

  const token = createSessionToken();
  await setAdminSessionCookie(token);

  const session = verifySessionToken(token);
  const expiresAt = new Date(session?.expiresAt ?? Date.now()).toISOString();

  return NextResponse.json<AdminAuthResponse>({ success: true, expiresAt }, { headers: NO_STORE });
}
