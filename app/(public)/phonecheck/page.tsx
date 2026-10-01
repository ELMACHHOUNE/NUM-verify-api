import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownIcon,
  CheckIcon,
  GlobeIcon,
  HistoryIcon,
  PhoneCallIcon,
  SearchIcon,
  ShieldCheckIcon,
  SignalIcon,
} from "lucide-react";

import { PhoneAnalyzer } from "@/components/phone/phone-analyzer";
import { RecentChecks } from "@/components/phone/recent-checks";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "PhoneCheck",
  description:
    "Validate phone numbers and look up country, carrier, location and line-type information with the Numverify API.",
};

const FEATURES = [
  {
    Icon: GlobeIcon,
    title: "Country detection",
    description: "Country name, ISO code and international dialing prefix.",
  },
  {
    Icon: SignalIcon,
    title: "Line type",
    description: "Mobile, landline, VoIP and other numbering line classifications.",
  },
  {
    Icon: ShieldCheckIcon,
    title: "Format checking",
    description: "Local and international formatting, validated against live numbering data.",
  },
] as const;

const RESULTS = [
  "Validity and formatting (local and international)",
  "Country name, ISO code and dialing prefix",
  "Carrier and line type (mobile, landline, VoIP)",
  "Location derived from the numbering plan",
] as const;

export default function PhoneCheckPage() {
  return (
    <>
      <section className="border-b border-border/70">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <SearchIcon className="size-3.5" aria-hidden="true" />
              Powered by the Numverify API
            </p>

            <h1 className="mt-6 font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Phone Number Validation &amp; Lookup
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
              Instantly analyze phone numbers with detailed country, carrier, location
              and line-type information.
            </p>

            <div className="mt-7">
              <Button asChild size="lg" className="h-10 px-5">
                <Link href="#analyzer">
                  Analyze a Number
                  <ArrowDownIcon aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>

          <dl className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
            {FEATURES.map(({ Icon, title, description }) => (
              <div
                key={title}
                className="rounded-lg border border-border bg-card p-4 text-left"
              >
                <dt className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
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

      <section id="analyzer" className="scroll-mt-20 border-b border-border/70">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
            <div className="min-w-0">
              <PhoneAnalyzer />
            </div>
            <div className="min-w-0 space-y-6 lg:sticky lg:top-20">
              <RecentChecks />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="how-it-works">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
            <div>
              <h2
                id="how-it-works"
                className="font-heading text-xl font-semibold tracking-tight sm:text-2xl"
              >
                How PhoneCheck works
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Enter a number with its country code and PhoneCheck queries the live
                Numverify database. The response shows whether the number is valid, which
                country and carrier it belongs to, and whether it is a mobile, landline or
                VoIP line.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Your lookup history never leaves this browser. It is stored locally and can
                be cleared at any time.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-5">
                <Link href="/history">
                  <HistoryIcon aria-hidden="true" />
                  View your history
                </Link>
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <PhoneCallIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                What you get back
              </div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {RESULTS.map((result) => (
                  <li key={result} className="flex gap-2">
                    <CheckIcon
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    {result}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}