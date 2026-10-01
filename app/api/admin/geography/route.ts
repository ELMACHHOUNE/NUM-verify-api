import { NextResponse } from "next/server";

import { getVisitorsByCity, getVisitorsByCountry } from "@/lib/analytics";
import { authError, authJson, requireAdmin } from "@/lib/auth-guard";
import { resolveDateRange } from "@/lib/date-range";
import { DatabaseError } from "@/lib/mongodb";

/** Country and city breakdowns for the geography page. */

const COUNTRY_LIMIT = 40;
const CITY_LIMIT = 60;

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
    const [countries, cities] = await Promise.all([
      getVisitorsByCountry(range, COUNTRY_LIMIT),
      getVisitorsByCity(range, CITY_LIMIT),
    ]);

    return authJson({ success: true, range, countries, cities });
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.error(`[admin/geography] ${error.code}: ${error.message}`);
      return authError("INTERNAL_ERROR");
    }
    console.error("[admin/geography] Unexpected failure", error);
    return authError("INTERNAL_ERROR");
  }
}