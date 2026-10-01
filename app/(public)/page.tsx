import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  BarChart3Icon,
  GlobeIcon,
  HistoryIcon,
  LineChartIcon,
  LockIcon,
  PhoneCallIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Phone intelligence & visitor analytics",
  description:
    "InsightHub combines instant Numverify phone validation with privacy-first visitor analytics powered by IPstack and MongoDB.",
};

const MODULES = [
  {
    href: "/phonecheck",
    Icon: PhoneCallIcon,
    title: "PhoneCheck",
    description:
      "Validate any phone number and see country, carrier, line type and formatting in one lookup.",
    cta: "Validate a number",
  },
  {
    href: "/history",
    Icon: HistoryIcon,
    title: "Validation history",
    description:
      "Every lookup you run is kept in your browser only — clear it whenever you like.",
    cta: "Open history",
  },
  {
    href: "/admin",
    Icon: LineChartIcon,
    title: "Visitor analytics",
    description:
      "See where visitors come from, which devices they use and how traffic moves over time.",
    cta: "Open dashboard",
  },
] as const;

const FEATURES = [
  {
    Icon: GlobeIcon,
    title: "Geography",
    description: "Countries, cities, regions, time zones and ISPs derived from IP addresses.",
  },
  {
    Icon: BarChart3Icon,
    title: "Activity over time",
    description: "Hourly, daily and monthly trends with one-click range presets.",
  },
  {
    Icon: ShieldCheckIcon,
    title: "Privacy first",
    description:
      "No cookies, no fingerprinting, no phone numbers in analytics. Locations are approximate.",
  },
] as const;

export default function Home() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <BarChart3Icon className="size-3.5" aria-hidden />
              Phone intelligence &amp; visitor analytics
            </p>

            <h1 className="mt-6 font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Understand your numbers — and your audience
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
              InsightHub pairs instant phone number validation with a private,
              self-hosted analytics dashboard. No third-party trackers, no cookies.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="h-10 px-5">
                <Link href="/phonecheck">
                  <PhoneCallIcon aria-hidden />
                  Validate a number
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-10 px-5">
                <Link href="/admin">
                  View analytics
                  <ArrowRightIcon aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="modules-heading" className="border-b border-border/70">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <h2
            id="modules-heading"
            className="text-center font-heading text-xl font-semibold tracking-tight sm:text-2xl"
          >
            Everything in one place
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {MODULES.map(({ href, Icon, title, description, cta }) => (
              <div
                key={title}
                className="flex flex-col rounded-lg border border-border bg-card p-5"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4.5" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-medium">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
                <Button asChild variant="ghost" size="sm" className="mt-4 self-start px-0">
                  <Link href={href}>
                    {cta}
                    <ArrowRightIcon aria-hidden />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="privacy-heading">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <LockIcon className="mx-auto size-5 text-muted-foreground" aria-hidden />
            <h2
              id="privacy-heading"
              className="mt-3 font-heading text-xl font-semibold tracking-tight sm:text-2xl"
            >
              Analytics without the creep factor
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              InsightHub records technical signals only — never names, e-mail addresses or
              phone numbers. Locations come from IP addresses and are approximate by design.
            </p>
          </div>

          <dl className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
            {FEATURES.map(({ Icon, title, description }) => (
              <div key={title} className="rounded-lg border border-border bg-card p-4 text-left">
                <dt className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                  {title}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}