import { NextResponse } from "next/server";

import { clearAdminSessionCookie } from "@/lib/auth";

/**
 * Admin sign-out.
 *
 * Always succeeds and always clears the cookie, so a caller can never be left
 * with a stale session it cannot remove.
 */

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(): Promise<Response> {
  await clearAdminSessionCookie();
  return NextResponse.json({ success: true }, { headers: NO_STORE });
}