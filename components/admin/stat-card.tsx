import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "cn";

export function StatCard({
  label,
  value,
  hint,
  Icon,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  Icon: LucideIcon;
  trend?: { value: string; positive: boolean };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {(hint || trend) && (
          <p className="mt-1 text-xs text-muted-foreground">
            {trend && (
              <span
                className={cn(
                  "mr-1 font-medium",
                  trend.positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
                )}
              >
                {trend.value}
              </span>
            )}
            {hint}
          </p>
        )}
      </CardContent>
    </Card>
  );
}