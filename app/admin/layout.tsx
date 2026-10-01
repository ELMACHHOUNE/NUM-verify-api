import { redirect } from "next/navigation";
import { BarChart3Icon, LogOutIcon } from "lucide-react";

import { isAdminAuthenticated } from "@/lib/auth";

import { AdminNav } from "./admin-nav";
import { AdminSignOut } from "./admin-sign-out";

/**
 * Admin shell.
 *
 * Every page under `/admin` (except `/admin/login`, which lives outside this
 * layout) is wrapped here, so the session check happens once per navigation
 * instead of per page.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) redirect("/admin/login");

  return (
    <div className="flex min-h-full">
      <AdminNav />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border/80 bg-background/80 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3Icon className="size-4" aria-hidden />
            <span className="font-medium text-foreground">InsightHub</span>
            <span aria-hidden>/</span>
            <span>Admin</span>
          </div>
          <AdminSignOut />
        </header>

        <main id="main" className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}