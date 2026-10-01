import Link from "next/link";
import { LockIcon } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/80">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md space-y-2">
            <p className="text-sm font-medium">InsightHub</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Phone intelligence and privacy-first visitor analytics. Phone data is provided
              by Numverify; visitor location and network data by IPstack.
            </p>
          </div>

          <p className="flex max-w-xs items-start gap-2 text-sm text-muted-foreground">
            <LockIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Phone lookup history is stored locally in your browser. Analytics records only
              technical signals — no names, e-mail addresses or phone numbers.
            </span>
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-border/70 pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Phone data by Numverify. Visitor data by IPstack.</p>
          <nav aria-label="Footer" className="flex gap-4">
            <Link
              href="/phonecheck"
              className="rounded-md underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              PhoneCheck
            </Link>
            <Link
              href="/history"
              className="rounded-md underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Validation history
            </Link>
            <Link
              href="/admin"
              className="rounded-md underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Analytics
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}