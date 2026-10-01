import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3Icon, ShieldIcon, UserIcon } from "lucide-react";

import { getCurrentSession } from "@/lib/auth";
import { formatDateTimeUtc } from "@/lib/analytics-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

/**
 * Account page for any signed-in user.
 *
 * A regular user sees only their own profile here — analytics are reserved for
 * the `admin` role, so this page deliberately links out to the dashboard only
 * when the account actually has that role.
 */
export default async function AccountPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const { user } = session;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Your account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {user.email}
          </p>
        </div>
        <SignOutButton />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Name</dt>
              <dd className="mt-0.5 text-sm">{user.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="mt-0.5 text-sm">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Role</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 text-sm capitalize">
                {user.role === "admin" ? (
                  <ShieldIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <UserIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                )}
                {user.role}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Member since</dt>
              <dd className="mt-0.5 text-sm">{formatDateTimeUtc(user.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Last sign-in</dt>
              <dd className="mt-0.5 text-sm">
                {user.lastLoginAt ? formatDateTimeUtc(user.lastLoginAt) : "This session"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {user.role === "admin" ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">Administrator tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Your account has the <span className="font-medium text-foreground">admin</span>{" "}
              role, so you can open the visitor analytics dashboard.
            </p>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 font-medium text-foreground underline underline-offset-4"
            >
              <BarChart3Icon className="size-4" aria-hidden="true" />
              Go to the dashboard
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">Visitor analytics</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            Analytics are limited to administrator accounts. Ask an administrator if you need
            access to the dashboard.
          </CardContent>
        </Card>
      )}
    </div>
  );
}