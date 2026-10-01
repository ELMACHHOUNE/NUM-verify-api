import type { Metadata } from "next";

import {
  getBreakdownByField,
  getDashboardStats,
  getRecentVisitors,
  getTrafficSources,
  getVisitorsByCity,
  getVisitorsByCountry,
  getVisitorsByPage,
  getVisitorsOverTime,
} from "@/lib/analytics";
import { pickGranularity, resolveDateRange } from "@/lib/date-range";
import { getSettings } from "@/lib/settings";

import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/**
 * Dashboard data is read on the server and handed to a client component.
 *
 * Fetching from a client component during streaming SSR fails, because a
 * relative URL cannot be resolved on the server; rendering the skeleton
 * server-side and filling it in the browser would also mean a flash of empty
 * charts. The date range lives in the URL, so switching it re-runs this
 * component.
 */
export default async function AdminDashboardPage({
  searchParams,
}: PageProps<"/admin">) {
  const params = await searchParams;
  const range = resolveDateRange(
    typeof params.range === "string" ? params.range : "",
    typeof params.from === "string" ? params.from : "",
    typeof params.to === "string" ? params.to : "",
  );

  const settings = await getSettings();

  const [stats, series, countries, cities, pages, devices, browsers, sources, recentVisitors] =
    await Promise.all([
      getDashboardStats(range, settings.activeWindowMinutes),
      getVisitorsOverTime(range),
      getVisitorsByCountry(range, 8),
      getVisitorsByCity(range, 8),
      getVisitorsByPage(range, 8),
      getBreakdownByField(range, "deviceType", 6),
      getBreakdownByField(range, "browser", 6),
      getTrafficSources(range, 6),
      getRecentVisitors(8),
    ]);

  return (
    <DashboardView
      data={{
        range: { preset: range.preset, label: range.label },
        granularity: pickGranularity(range),
        stats,
        series,
        countries,
        cities,
        pages,
        devices,
        browsers,
        sources,
        recentVisitors,
      }}
    />
  );
}