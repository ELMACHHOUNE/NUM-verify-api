import { adminError, adminJson, rejectUnauthenticated } from "@/lib/admin-api";
import { getVisitorById, isValidObjectId } from "@/lib/analytics";
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
  const unauthorized = await rejectUnauthenticated();
  if (unauthorized) return unauthorized;

  const { id } = await params;

  if (!isValidObjectId(id)) {
    return adminJson({ success: false, error: "Visitor not found." }, { status: 404 });
  }

  try {
    const visitor = await getVisitorById(id);

    if (!visitor) {
      return adminJson({ success: false, error: "Visitor not found." }, { status: 404 });
    }

    return adminJson({ success: true, visitor });
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.error(`[admin/visitors/${id}] ${error.code}: ${error.message}`);
      return adminError("INTERNAL_ERROR");
    }
    console.error(`[admin/visitors/${id}] Unexpected failure`, error);
    return adminError("INTERNAL_ERROR");
  }
}