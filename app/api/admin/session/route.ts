import { NextResponse } from "next/server";

import { getAdminSession, isAuthConfigured } from "@/lib/auth";

/**
 * Lightweight session probe used by the admin shell to decide whether to render
 * the dashboard or the sign-in form. Returns only a boolean and an expiry, never
 * any secret material.
 */

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(): Promise<Response> {
  const session = await getAdminSession();

  return NextResponse.json(
    {
      success: true,
      authenticated: session !== null,
      configured: isAuthConfigured(),
      expiresAt: session ? new Date(session.expiresAt).toISOString() : null,
    },
    { headers: NO_STORE },
  );
}