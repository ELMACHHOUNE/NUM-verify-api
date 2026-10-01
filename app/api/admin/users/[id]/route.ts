import { NextResponse } from "next/server";

import { findUserById, toPublicUser } from "@/lib/auth";
import { NO_STORE, authError, authJson, requireAdmin } from "@/lib/auth-guard";
import { DatabaseError } from "@/lib/mongodb";
import { deleteUser, setUserActive, setUserRole } from "@/lib/users";
import { updateUserSchema } from "@/lib/validations";

/**
 * Update or delete one account.
 *
 * `PATCH` changes the role and/or active state; `DELETE` removes the account and
 * all of its sessions. Both refuse to remove the last active administrator.
 */

const MAX_BODY_BYTES = 2_048;

function lastAdminResponse() {
  return NextResponse.json(
    {
      success: false,
      error: "At least one active administrator must remain.",
      code: "LAST_ADMIN",
    } satisfies { success: false; error: string; code: "LAST_ADMIN" },
    { status: 409, headers: NO_STORE },
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return authError("INVALID_REQUEST");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return authError("INVALID_REQUEST");
  }

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return authError("INVALID_REQUEST");
  }

  // Admins may not demote or disable themselves: that is the most likely way to
  // lock yourself out of the installation by accident.
  if (id === guard.user.id && (parsed.data.role === "user" || parsed.data.isActive === false)) {
    return authError("FORBIDDEN");
  }

  try {
    const existing = await findUserById(id);
    if (!existing) {
      return authJson({ success: false, error: "Account not found." }, { status: 404 });
    }

    // Merge the requested changes onto the account as it stands right now, so a
    // partial patch still returns a complete user.
    const nextRole = parsed.data.role ?? (existing.role === "admin" ? "admin" : "user");
    const nextActive = parsed.data.isActive ?? existing.isActive !== false;

    let updated = toPublicUser(existing);

    if (parsed.data.role !== undefined) {
      const result = await setUserRole(id, nextRole);
      if ("error" in result) {
        if (result.error === "NOT_FOUND") {
          return authJson({ success: false, error: "Account not found." }, { status: 404 });
        }
        return lastAdminResponse();
      }
      updated = result.user;
    }

    if (parsed.data.isActive !== undefined) {
      const result = await setUserActive(id, nextActive);
      if ("error" in result) {
        if (result.error === "NOT_FOUND") {
          return authJson({ success: false, error: "Account not found." }, { status: 404 });
        }
        return lastAdminResponse();
      }
      updated = result.user;
    }

    return authJson({ success: true, user: updated });
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.error(`[admin/users/${id}] ${error.code}: ${error.message}`);
      return authError("INTERNAL_ERROR");
    }
    console.error(`[admin/users/${id}] Unexpected failure`, error);
    return authError("INTERNAL_ERROR");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;

  if (id === guard.user.id) return authError("FORBIDDEN");

  try {
    const result = await deleteUser(id);

    if ("error" in result) {
      if (result.error === "NOT_FOUND") {
        return authJson({ success: false, error: "Account not found." }, { status: 404 });
      }
      return lastAdminResponse();
    }

    return authJson({ success: true });
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.error(`[admin/users/${id}] ${error.code}: ${error.message}`);
      return authError("INTERNAL_ERROR");
    }
    console.error(`[admin/users/${id}] Unexpected failure`, error);
    return authError("INTERNAL_ERROR");
  }
}