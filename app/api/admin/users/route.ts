import { NextResponse } from "next/server";

import { authError, authJson, requireAdmin } from "@/lib/auth-guard";
import { DatabaseError } from "@/lib/mongodb";
import { listUsers } from "@/lib/users";

/** All accounts, for the admin user-management table. Admin only. */

export async function GET(): Promise<Response> {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  try {
    const users = await listUsers();

    return authJson({
      success: true,
      users,
      summary: {
        total: users.length,
        admins: users.filter((u) => u.role === "admin").length,
        active: users.filter((u) => u.isActive).length,
      },
    });
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.error(`[admin/users] ${error.code}: ${error.message}`);
      return authError("INTERNAL_ERROR");
    }
    console.error("[admin/users] Unexpected failure", error);
    return authError("INTERNAL_ERROR");
  }
}