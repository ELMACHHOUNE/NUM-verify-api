import { NextResponse } from "next/server";

import {
  AuthError,
  issueSession,
  markLogin,
  setSessionCookie,
  verifyCredentials,
} from "@/lib/auth";
import { NO_STORE, authError, authJson } from "@/lib/auth-guard";
import { getClientIp } from "@/lib/get-client-ip";
import { DatabaseError } from "@/lib/mongodb";
import { checkRateLimitWithRule, getClientKey, LOGIN_LIMIT } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations";
import type { AuthResponse } from "@/types/auth";

/**
 * Account sign-in.
 *
 * Administrators and regular users use the same endpoint; the response reports
 * the role so the client can route to `/admin` or `/account`. Rate limited per IP
 * on a 15-minute window, and verification is deliberately constant-time.
 */

const MAX_BODY_BYTES = 4_096;

export async function POST(request: Request): Promise<Response> {
  const { limited, retryAfterSeconds } = checkRateLimitWithRule(
    getClientKey(request),
    LOGIN_LIMIT,
  );
  if (limited) {
    return authError("RATE_LIMITED", { "Retry-After": String(retryAfterSeconds) });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return authError("INVALID_REQUEST");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return authError("INVALID_REQUEST");
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<AuthResponse>(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Enter your email and password.",
        code: "INVALID_REQUEST",
      },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const { user } = await verifyCredentials(parsed.data.email, parsed.data.password);

    const { token, expiresAt } = await issueSession(String(user._id), {
      userAgent: request.headers.get("user-agent"),
      ip: getClientIp(request.headers),
    });

    await setSessionCookie(token);
    await markLogin(String(user._id));

    return authJson<AuthResponse>({
      success: true,
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        role: user.role === "admin" ? "admin" : "user",
        isActive: true,
        createdAt: new Date(user.createdAt).toISOString(),
        lastLoginAt: new Date().toISOString(),
      },
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (error) {
    if (error instanceof AuthError) return authError(error.code);
    if (error instanceof DatabaseError) {
      console.error(`[auth/login] ${error.code}: ${error.message}`);
      return authError("INTERNAL_ERROR");
    }
    console.error("[auth/login] Unexpected failure", error);
    return authError("INTERNAL_ERROR");
  }
}