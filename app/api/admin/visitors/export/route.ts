import { NextResponse } from "next/server";

import { parseVisitorQuery } from "@/lib/admin-api";
import { authError, requireAdmin } from "@/lib/auth-guard";
import { getVisitorExportRows } from "@/lib/analytics";
import { toCsv } from "@/lib/csv";
import { DatabaseError } from "@/lib/mongodb";
import type { VisitorExportRow } from "@/types/analytics";

/**
 * CSV export of the current visitor filter.
 *
 * Honours the same query parameters as `/api/admin/visitors`, is capped at
 * {@link EXPORT_ROW_LIMIT} rows, and escapes every cell.
 */

/**
 * Column order for the CSV. Derived from the row type, so adding a field to
 * {@link VisitorExportRow} is the only step needed to surface it here.
 */
const EXPORT_COLUMNS = [
  "ip",
  "country",
  "region",
  "city",
  "isp",
  "device",
  "browser",
  "os",
  "firstSeen",
  "lastSeen",
  "visits",
] as const satisfies readonly (keyof VisitorExportRow)[];

export async function GET(request: Request): Promise<Response> {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { searchParams } = new URL(request.url);
  const query = parseVisitorQuery(searchParams);

  try {
    const rows = await getVisitorExportRows(query);
    const csv = rows.length > 0 ? toCsv(EXPORT_COLUMNS, rows) : EXPORT_COLUMNS.join(",");

    const stamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="insighthub-visitors-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.error(`[admin/visitors/export] ${error.code}: ${error.message}`);
      return authError("INTERNAL_ERROR");
    }
    console.error("[admin/visitors/export] Unexpected failure", error);
    return authError("INTERNAL_ERROR");
  }
}