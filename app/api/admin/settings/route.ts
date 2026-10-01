import { NextResponse } from "next/server";

import { adminError, adminJson, rejectUnauthenticated } from "@/lib/admin-api";
import { DatabaseError } from "@/lib/mongodb";
import { getSettings, saveSettings } from "@/lib/settings";
import { appSettingsSchema } from "@/lib/validations";
import type { AppSettings } from "@/types/analytics";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(): Promise<Response> {
  const unauthorized = await rejectUnauthenticated();
  if (unauthorized) return unauthorized;

  try {
    const settings = await getSettings();
    return adminJson({ success: true, settings });
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.error(`[admin/settings] ${error.code}: ${error.message}`);
      return adminError("INTERNAL_ERROR");
    }
    console.error("[admin/settings] Unexpected failure", error);
    return adminError("INTERNAL_ERROR");
  }
}

export async function PATCH(request: Request): Promise<Response> {
  const unauthorized = await rejectUnauthenticated();
  if (unauthorized) return unauthorized;

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
    return adminJson({ success: true, settings });
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.error(`[admin/settings] ${error.code}: ${error.message}`);
      return adminError("INTERNAL_ERROR");
    }
    console.error("[admin/settings] Unexpected failure", error);
    return adminError("INTERNAL_ERROR");
  }
}