import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { NO_STORE } from "@/lib/auth-guard";

/**
 * Session probe used by the navbar and the account/admin pages to learn who is
 * signed in.
 *
 * Returns only the public profile — never a token, hash or session id.
 */

export async function GET(): Promise<Response> {
  const session = await getCurrentSession();

  return NextResponse.json(
    {
      success: true,
      authenticated: session !== null,
      user: session?.user ?? null,
    },
    { headers: NO_STORE },
  );
}