"use client";

import { useEffect, useState } from "react";

import type { PublicUser } from "@/types/auth";

interface SessionState {
  user: PublicUser | null;
  /** True until the first probe resolves, so the UI can avoid a sign-in flash. */
  loading: boolean;
}

/**
 * Reads the current session once per mount and caches it at module scope.
 *
 * The navbar and the footer both need to know whether someone is signed in.
 * Probing twice would be wasteful, and a shared promise means the request is
 * also deduplicated across React's double-invoked effects in development.
 */
let cached: SessionState | null = null;
let inFlight: Promise<PublicUser | null> | null = null;

async function probe(): Promise<PublicUser | null> {
  inFlight ??= fetch("/api/auth/session", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((data: { user?: PublicUser | null } | null) => data?.user ?? null)
    .catch(() => null)
    .finally(() => {
      // Allow a later retry (for example after signing in and navigating back).
      inFlight = null;
    });

  return inFlight;
}

/** Invalidates the cached session, e.g. right after sign-in or sign-out. */
export function resetSessionCache(): void {
  cached = null;
}

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>(
    cached ?? { user: null, loading: true },
  );

  useEffect(() => {
    if (cached) return;

    let active = true;

    void probe().then((user) => {
      if (!active) return;
      const next: SessionState = { user, loading: false };
      cached = next;
      setState(next);
    });

    return () => {
      active = false;
    };
  }, []);

  return state;
}