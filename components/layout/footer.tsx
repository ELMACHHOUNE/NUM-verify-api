import Link from "next/link";
import { LockIcon } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/80">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md space-y-2">
            <p className="text-sm font-medium">PhoneCheck</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Phone number validation and information lookup powered by the Numverify
              API. This tool reports publicly available numbering data and does not
              verify who owns a number.
            </p>
          </div>

          <p className="flex max-w-xs items-start gap-2 text-sm text-muted-foreground">
            <LockIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Phone lookup history is stored locally in your browser. Numbers are sent to
              the lookup provider only when you run a lookup.
            </span>
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-border/70 pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Data provided by Numverify.</p>
          <nav aria-label="Footer">
            <Link
              href="/history"
              className="rounded-md underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Validation history
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
