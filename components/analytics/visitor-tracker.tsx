"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Sends a page view to `/api/analytics/track`.
 *
 * Deliberately client-only and dependency-free:
 * - fires once per pathname, so client-side navigation is counted too;
 * - uses `sendBeacon` where available so a view is not lost when the tab closes;
 * - fails silently — analytics must never surface an error to a visitor.
 */
export function VisitorTracker(): null {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    const payload = JSON.stringify({
      page: pathname,
      // `document.referrer` is empty on a fresh navigation from outside the app;
      // the server also falls back to the Referer header when this is absent.
      referrer: document.referrer || undefined,
    });

    const url = "/api/analytics/track";

    if (typeof navigator.sendBeacon === "function") {
      try {
        const accepted = navigator.sendBeacon(
          url,
          new Blob([payload], { type: "application/json" }),
        );
        if (accepted) return;
      } catch {
        // Fall through to fetch.
      }
    }

    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Swallow: a failed page view is not worth reporting to the visitor.
    });
  }, [pathname]);

  return null;
}