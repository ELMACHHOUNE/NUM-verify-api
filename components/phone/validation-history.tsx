"use client";

import Link from "next/link";
import { HistoryIcon, LockIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { HistoryRow } from "@/components/phone/recent-checks";
import { useHistory } from "@/hooks/use-history";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clearHistory } from "@/lib/history";

export function ValidationHistory() {
  const history = useHistory();

  const handleClear = () => {
    clearHistory();
    toast.success("Lookup history cleared.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Validation history
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every successful lookup from this browser, newest first.
          </p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={history.length === 0}>
              <Trash2Icon aria-hidden />
              Clear history
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear validation history?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes all {history.length} saved lookup
                {history.length === 1 ? "" : "s"} from this browser. It cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClear}>Clear history</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {history.length} saved lookup{history.length === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <HistoryIcon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium">Nothing here yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Run a lookup and it will be listed here automatically.
                </p>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link href="/">Analyze a number</Link>
              </Button>
            </div>
          ) : (
            <ul className="-mx-4 -my-4">
              {history.map((entry) => (
                <HistoryRow key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <LockIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          Phone lookup history is stored locally in your browser and is never uploaded to
          a PhoneCheck server. Numbers are sent to the lookup provider only when you run a
          lookup.
        </span>
      </p>
    </div>
  );
}
