import { adminError, adminJson, rejectUnauthenticated } from "@/lib/admin-api";
import { getVisitorsByCity, getVisitorsByCountry } from "@/lib/analytics";
import { resolveDateRange } from "@/lib/date-range";
import { DatabaseError } from "@/lib/mongodb";

/** Country and city breakdowns for the geography page. */

const COUNTRY_LIMIT = 40;
const CITY_LIMIT = 60;

export async function GET(request: Request): Promise<Response> {
  const unauthorized = await rejectUnauthenticated();
  if (unauthorized) return unauthorized;

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

    return adminJson({ success: true, range, countries, cities });
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.error(`[admin/geography] ${error.code}: ${error.message}`);
      return adminError("INTERNAL_ERROR");
    }
    console.error("[admin/geography] Unexpected failure", error);
    return adminError("INTERNAL_ERROR");
  }
}