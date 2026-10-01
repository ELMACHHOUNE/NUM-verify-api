import { CircleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ResultErrorProps {
  message: string;
  onRetry?: () => void;
}

export function ResultError({ message, onRetry }: ResultErrorProps) {
  return (
    <Card
      role="alert"
      aria-live="assertive"
      className="border-destructive/40 bg-destructive/5 dark:bg-destructive/10"
    >
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <CircleAlertIcon
            className="mt-0.5 size-5 shrink-0 text-destructive"
            aria-hidden
          />
          <div>
            <p className="text-sm font-medium text-destructive">Lookup failed</p>
            <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        {onRetry ? (
          <Button variant="outline" onClick={onRetry} className="shrink-0">
            Try again
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
