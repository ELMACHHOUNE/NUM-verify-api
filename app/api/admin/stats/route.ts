import {
  getBreakdownByField,
  getDashboardStats,
  getRecentVisitors,
  getTrafficSources,
  getVisitorsByCity,
  getVisitorsByCountry,
  getVisitorsOverTime,
  getVisitorsByPage,
} from "@/lib/analytics";
import { NextResponse } from "next/server";

import { authError, authJson, requireAdmin } from "@/lib/auth-guard";
import { pickGranularity, resolveDateRange } from "@/lib/date-range";
import { DatabaseError } from "@/lib/mongodb";
import { getSettings } from "@/lib/settings";

/**
 * Everything the admin dashboard renders, in one round trip.
 *
 * Aggregated server-side so the client never receives raw visitor documents, and
 * so the initial paint does not fan out into a dozen requests.
 */

export async function GET(request: Request): Promise<Response> {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { searchParams } = new URL(request.url);
  const range = resolveDateRange(
    searchParams.get("range") ?? "",
    searchParams.get("from") ?? "",
    searchParams.get("to") ?? "",
  );

  try {
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

    return authJson({
      success: true,
      range,
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
    });
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.error(`[admin/stats] ${error.code}: ${error.message}`);
      return authError("INTERNAL_ERROR");
    }
    console.error("[admin/stats] Unexpected failure", error);
    return authError("INTERNAL_ERROR");
  }
}