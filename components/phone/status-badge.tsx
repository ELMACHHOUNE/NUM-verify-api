import { CircleCheckIcon, CircleXIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

interface StatusBadgeProps {
  valid: boolean;
  className?: string;
}

/**
 * Communicates validity with an icon *and* text, never colour alone.
 */
export function StatusBadge({ valid, className }: StatusBadgeProps) {
  return (
    <Badge
      variant={valid ? "default" : "destructive"}
      className={cn(
        "h-6 gap-1.5 px-2.5 text-xs",
        valid &&
          "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950",
        className,
      )}
    >
      {valid ? (
        <CircleCheckIcon className="size-3.5" aria-hidden />
      ) : (
        <CircleXIcon className="size-3.5" aria-hidden />
      )}
      {valid ? "Valid phone number" : "Invalid phone number"}
    </Badge>
  );
}
