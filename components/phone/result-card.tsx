import type { LucideIcon } from "lucide-react";

import { UNAVAILABLE_LABEL } from "@/lib/format";
import { cn } from "cn";

interface ResultCardProps {
  icon: LucideIcon;
  label: string;
  value: string | null;
  hint?: string | null;
  mono?: boolean;
}

export function ResultCard({ icon: Icon, label, value, hint, mono }: ResultCardProps) {
  const displayValue = value?.trim() ? value : UNAVAILABLE_LABEL;
  const isMissing = displayValue === UNAVAILABLE_LABEL;

  return (
    <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" aria-hidden />
        <span className="text-xs font-medium tracking-wide uppercase">{label}</span>
      </div>
      <p
        className={cn(
          "mt-2 break-words text-sm font-medium",
          isMissing && "font-normal text-muted-foreground",
          mono && "font-mono tracking-tight",
        )}
      >
        {displayValue}
      </p>
      {hint && !isMissing ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
