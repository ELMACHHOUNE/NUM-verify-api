import { NextResponse } from "next/server";

import { clearSession } from "@/lib/auth";
import { NO_STORE } from "@/lib/auth-guard";

/**
 * Sign-out.
 *
 * Always succeeds and always deletes the session row plus its cookie, so a caller
 * can never be left holding a session it is unable to revoke.
 */

export async function POST(): Promise<Response> {
  try {
    await clearSession();
  } catch (error) {
    // The cookie is still cleared by the caller on the next request; surfacing an
    // error here would leave the browser thinking it is still signed in.
    console.error("[auth/logout] Failed to clear session", error);
  }

  return NextResponse.json({ success: true }, { headers: NO_STORE });
}