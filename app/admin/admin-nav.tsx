"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  GlobeIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";

import { cn } from "cn";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboardIcon, exact: true },
  { href: "/admin/visitors", label: "Visitors", Icon: BarChart3Icon, exact: false },
  { href: "/admin/geography", label: "Geography", Icon: GlobeIcon, exact: false },
  { href: "/admin/users", label: "Users", Icon: UsersIcon, exact: false },
  { href: "/admin/settings", label: "Settings", Icon: SettingsIcon, exact: false },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border/80 bg-card/40 md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border/80 px-4">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BarChart3Icon className="size-4" aria-hidden />
        </span>
        <span className="text-sm font-medium tracking-tight">InsightHub</span>
      </div>

      <nav aria-label="Admin" className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map(({ href, label, Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                isActive
                  ? "bg-primary/10 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/80 p-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <BarChart3Icon className="size-4" aria-hidden />
          Back to site
        </Link>
      </div>
    </aside>
  );
}