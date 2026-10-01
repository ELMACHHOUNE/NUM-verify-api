import { NextResponse } from "next/server";

import { getVisitorById, isValidObjectId } from "@/lib/analytics";
import { authError, authJson, requireAdmin } from "@/lib/auth-guard";
import { DatabaseError } from "@/lib/mongodb";

/**
 * Full detail for a single visitor, used by the visitor drawer/page.
 *
 * The id is validated as an ObjectId before it reaches MongoDB, so a malformed
 * value is rejected without touching the database.
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;

  if (!isValidObjectId(id)) {
    return authJson({ success: false, error: "Visitor not found." }, { status: 404 });
  }

  try {
    const visitor = await getVisitorById(id);

    if (!visitor) {
      return authJson({ success: false, error: "Visitor not found." }, { status: 404 });
    }

    return authJson({ success: true, visitor });
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.error(`[admin/visitors/${id}] ${error.code}: ${error.message}`);
      return authError("INTERNAL_ERROR");
    }
    console.error(`[admin/visitors/${id}] Unexpected failure`, error);
    return authError("INTERNAL_ERROR");
  }
}