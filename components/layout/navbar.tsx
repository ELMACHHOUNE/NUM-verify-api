"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  HistoryIcon,
  LineChartIcon,
  PhoneCallIcon,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

/**
 * Public navigation.
 *
 * `/phonecheck` is the product's phone module and keeps the PhoneCheck name —
 * InsightHub is the platform, PhoneCheck is the tool inside it.
 */

const NAV_LINKS = [
  { href: "/phonecheck", label: "PhoneCheck", Icon: PhoneCallIcon },
  { href: "/history", label: "History", Icon: HistoryIcon },
  { href: "/admin", label: "Analytics", Icon: LineChartIcon },
] as const;

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/80 backdrop-blur-sm">
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6"
      >
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BarChart3Icon className="size-4" aria-hidden />
          </span>
          <span className="text-[0.95rem] tracking-tight">InsightHub</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {NAV_LINKS.map(({ href, label, Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Button
                key={href}
                asChild
                variant="ghost"
                size="sm"
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  isActive && "bg-muted text-foreground",
                )}
              >
                <Link href={href}>
                  <Icon aria-hidden />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sr-only sm:hidden">{label}</span>
                </Link>
              </Button>
            );
          })}

          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}