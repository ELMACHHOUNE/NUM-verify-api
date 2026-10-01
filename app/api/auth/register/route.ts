import { NextResponse } from "next/server";

import {
  createUser,
  issueSession,
  markLogin,
  setSessionCookie,
  AuthError,
} from "@/lib/auth";
import { NO_STORE, authError, authJson } from "@/lib/auth-guard";
import { getClientIp } from "@/lib/get-client-ip";
import { DatabaseError } from "@/lib/mongodb";
import { checkRateLimitWithRule, getClientKey, REGISTER_LIMIT } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validations";
import type { AuthResponse } from "@/types/auth";

/**
 * Self-service account creation.
 *
 * Open registration, but the role is hard-coded to `user`: there is no request
 * field that can promote an account to admin, so this endpoint can never be
 * used to gain access to `/admin`.
 */

const MAX_BODY_BYTES = 4_096;

export async function POST(request: Request): Promise<Response> {
  const { limited, retryAfterSeconds } = checkRateLimitWithRule(
    getClientKey(request),
    REGISTER_LIMIT,
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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<AuthResponse>(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid registration details.",
        code: "INVALID_REQUEST",
      },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const user = await createUser({
      email: parsed.data.email,
      name: parsed.data.name,
      password: parsed.data.password,
      // Never taken from the client.
      role: "user",
    });

    const { token, expiresAt } = await issueSession(user.id, {
      userAgent: request.headers.get("user-agent"),
      ip: getClientIp(request.headers),
    });

    await setSessionCookie(token);
    await markLogin(user.id);

    return authJson<AuthResponse>({
      success: true,
      user,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return authError(error.code);
    }
    // A unique-index violation can still surface as a raw driver error when two
    // registrations race between the pre-check and the insert.
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return authError("EMAIL_TAKEN");
    }
    if (error instanceof DatabaseError) {
      console.error(`[auth/register] ${error.code}: ${error.message}`);
      return authError("INTERNAL_ERROR");
    }
    console.error("[auth/register] Unexpected failure", error);
    return authError("INTERNAL_ERROR");
  }
}