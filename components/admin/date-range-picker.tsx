"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "cn";
import { PRESET_LABELS } from "@/lib/date-range";
import type { DateRangePreset } from "@/types/analytics";

const PRESETS = [
  "today",
  "yesterday",
  "last7",
  "last30",
  "thisYear",
  "allTime",
] as const;

/**
 * Date-range selector shared by every admin page.
 *
 * Writes `range` / `from` / `to` into the URL query string so a dashboard view
 * stays shareable and survives a refresh.
 */
export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentRange = searchParams.get("range") ?? "last7";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  function update(params: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  function selectPreset(preset: DateRangePreset) {
    update({ range: preset, from: "", to: "" });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label="Date range preset"
        className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-card p-1"
      >
        {PRESETS.map((preset) => (
          <Button
            key={preset}
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={currentRange === preset}
            onClick={() => selectPreset(preset)}
            className={cn(
              "h-7 px-2.5 text-xs",
              currentRange === preset && "bg-primary/10 text-foreground",
            )}
          >
            {PRESET_LABELS[preset]}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <CalendarIcon className="size-4 text-muted-foreground" aria-hidden />
        <Input
          type="date"
          aria-label="From date"
          value={from}
          max={to || undefined}
          onChange={(event) => update({ range: "custom", from: event.target.value })}
          className="h-8 w-[8.5rem] text-xs"
        />
        <span className="text-xs text-muted-foreground" aria-hidden>
          –
        </span>
        <Input
          type="date"
          aria-label="To date"
          value={to}
          min={from || undefined}
          onChange={(event) => update({ range: "custom", to: event.target.value })}
          className="h-8 w-[8.5rem] text-xs"
        />
      </div>
    </div>
  );
}