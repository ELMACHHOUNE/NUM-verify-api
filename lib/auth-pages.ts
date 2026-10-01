import { getCurrentSession } from "@/lib/auth";

/**
 * Shared guard for the public auth pages (`/login`, `/signup`).
 *
 * Someone who is already signed in has no business on these routes, so send
 * them where they actually belong: `/admin` for an administrator, `/account`
 * for everyone else.
 *
 * Returns the path to redirect to, or `null` when the visitor is anonymous and
 * the page should render. Returning a value (rather than performing the
 * redirect) keeps `next/navigation`'s `redirect()` out of a shared helper, which
 * would otherwise throw a control-flow error inside a plain function.
 */
export async function authenticatedRedirectPath(): Promise<string | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  return session.user.role === "admin" ? "/admin" : "/account";
}