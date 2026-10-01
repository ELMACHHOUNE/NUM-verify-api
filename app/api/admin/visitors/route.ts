import { adminError, adminJson, parseVisitorQuery, rejectUnauthenticated } from "@/lib/admin-api";
import { getVisitorFilterOptions, getVisitors } from "@/lib/analytics";
import { DatabaseError } from "@/lib/mongodb";

/**
 * Paginated, filterable visitor list plus the filter dropdown options.
 *
 * The options come from the database itself (distinct countries/cities/etc.), so
 * the UI never offers a filter that would return nothing.
 */

export async function GET(request: Request): Promise<Response> {
  const unauthorized = await rejectUnauthenticated();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const query = parseVisitorQuery(searchParams);

  try {
    const [result, options] = await Promise.all([getVisitors(query), getVisitorFilterOptions()]);

    return adminJson({
      success: true,
      ...result,
      query: {
        range: query.range.preset,
        sort: query.sort,
        direction: query.direction,
      },
      options,
    });
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.error(`[admin/visitors] ${error.code}: ${error.message}`);
      return adminError("INTERNAL_ERROR");
    }
    console.error("[admin/visitors] Unexpected failure", error);
    return adminError("INTERNAL_ERROR");
  }
}