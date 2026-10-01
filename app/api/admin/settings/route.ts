import { NextResponse } from "next/server";

import { authError, authJson, requireAdmin } from "@/lib/auth-guard";
import { DatabaseError } from "@/lib/mongodb";
import { getSettings, saveSettings } from "@/lib/settings";
import { appSettingsSchema } from "@/lib/validations";
import type { AppSettings } from "@/types/analytics";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(): Promise<Response> {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  try {
    const settings = await getSettings();
    return authJson({ success: true, settings });
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.error(`[admin/settings] ${error.code}: ${error.message}`);
      return authError("INTERNAL_ERROR");
    }
    console.error("[admin/settings] Unexpected failure", error);
    return authError("INTERNAL_ERROR");
  }
}

export async function PATCH(request: Request): Promise<Response> {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid settings payload.", code: "INVALID_REQUEST" },
      { status: 400, headers: NO_STORE },
    );
  }

  const parsed = appSettingsSchema.partial().safeParse(body);

  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { success: false, error: "Invalid settings payload.", code: "INVALID_REQUEST" },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    // `getSettings()` already applies the persisted document over the defaults,
    // so merging first keeps every untouched field at its stored value.
    const current = await getSettings();
    const settings: AppSettings = await saveSettings({ ...current, ...parsed.data });
    return authJson({ success: true, settings });
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.error(`[admin/settings] ${error.code}: ${error.message}`);
      return authError("INTERNAL_ERROR");
    }
    console.error("[admin/settings] Unexpected failure", error);
    return authError("INTERNAL_ERROR");
  }
}