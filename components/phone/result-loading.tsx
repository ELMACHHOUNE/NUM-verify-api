import { Loader2Icon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ResultLoading() {
  return (
    <Card aria-busy="true" aria-live="polite">
      <CardHeader>
        <CardTitle>Analyzing number…</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">Checking phone information…</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2" aria-hidden>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="rounded-lg border border-border p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-4 w-32" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
