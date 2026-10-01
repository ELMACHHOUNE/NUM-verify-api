"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { useHistory } from "@/hooks/use-history";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCheckedAt, formatCountryAndLineType } from "@/lib/format";
import type { HistoryEntry } from "@/types/phone";

export function HistoryRow({ entry }: { entry: HistoryEntry }) {
  return (
    <li className="flex flex-col gap-1 border-b border-border/70 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="truncate font-mono text-sm font-medium break-all">
          {entry.phoneNumber}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {formatCountryAndLineType(entry.countryName, entry.lineType)}
        </p>
      </div>
      <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {formatCheckedAt(entry.checkedAt)}
      </p>
    </li>
  );
}

/** Compact list of the most recent lookups, shown under the analyzer. */
export function RecentChecks() {
  const history = useHistory();
  const recent = history.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Recent checks</CardTitle>
          {history.length > 0 ? (
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link href="/history">
                View all
                <ArrowRightIcon aria-hidden />
              </Link>
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No lookups yet. Your recent analyses will appear here.
          </p>
        ) : (
          <ul className="-mx-4 -my-4">
            {recent.map((entry) => (
              <HistoryRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
