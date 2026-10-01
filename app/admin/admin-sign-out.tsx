"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon, LogOutIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { resetSessionCache } from "@/components/layout/use-session";

export function AdminSignOut({ name }: { name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      resetSessionCache();
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-xs text-muted-foreground sm:inline">{name}</span>
      <Button variant="ghost" size="sm" onClick={signOut} disabled={loading}>
        {loading ? (
          <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogOutIcon aria-hidden="true" />
        )}
        <span className="hidden sm:inline">Sign out</span>
        <span className="sr-only sm:hidden">Sign out</span>
      </Button>
    </div>
  );
}