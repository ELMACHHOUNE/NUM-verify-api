import { redirect } from "next/navigation";
import { BarChart3Icon } from "lucide-react";

import { getCurrentSession } from "@/lib/auth";

import { AdminNav } from "./admin-nav";
import { AdminSignOut } from "./admin-sign-out";

/**
 * Admin shell.
 *
 * Every page under `/admin` is wrapped here, so the session and role check
 * happens once per navigation. `/admin/login` no longer exists — authentication
 * happens at `/login`, and an unauthenticated visitor is sent there.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getCurrentSession();

  if (!session) redirect("/login");
  // A signed-in non-admin is authenticated but not authorised. Redirecting to
  // `/account` is friendlier than showing a bare 403.
  if (session.user.role !== "admin") redirect("/account");

  return (
    <div className="flex min-h-full">
      <AdminNav />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border/80 bg-background/80 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3Icon className="size-4" aria-hidden="true" />
            <span className="font-medium text-foreground">InsightHub</span>
            <span aria-hidden="true">/</span>
            <span>Admin</span>
          </div>
          <AdminSignOut name={session.user.name} />
        </header>

        <main id="main" className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}