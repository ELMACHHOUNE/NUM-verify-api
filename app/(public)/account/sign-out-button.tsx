"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon, LogOutIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { resetSessionCache } from "@/components/layout/use-session";

/**
 * Sign-out control.
 *
 * Revokes the session on the server, then returns the visitor to the public site
 * rather than bouncing them back to a page that would immediately redirect.
 */
export function SignOutButton({ className }: { className?: string }) {
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
    <Button
      variant="outline"
      size="sm"
      onClick={signOut}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <LogOutIcon aria-hidden="true" />
      )}
      {loading ? "Signing out…" : "Sign out"}
    </Button>
  );
}