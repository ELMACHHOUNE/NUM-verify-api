import "server-only";

import { z } from "zod";

import type { LineType, PhoneErrorCode, PhoneValidationResult } from "@/types/phone";
import { LINE_TYPES } from "@/types/phone";

const NUMVERIFY_ENDPOINT = "http://apilayer.net/api/validate";
const REQUEST_TIMEOUT_MS = 10_000;

const LINE_TYPE_SET = new Set<string>(LINE_TYPES);

/** Raw Numverify lookup payload. `location`/`carrier` depend on the plan. */
const numverifyLookupSchema = z.object({
  valid: z.boolean(),
  number: z.string().nullish(),
  local_format: z.string().nullish(),
  international_format: z.string().nullish(),
  country_prefix: z.string().nullish(),
  country_code: z.string().nullish(),
  country_name: z.string().nullish(),
  location: z.string().nullish(),
  carrier: z.string().nullish(),
  line_type: z.string().nullish(),
});

const numverifyErrorSchema = z.object({
  success: z.literal(false),
  error: z
    .object({
      code: z.number().nullish(),
      type: z.string().nullish(),
      info: z.string().nullish(),
    })
    .nullish(),
});

/**
 * Error raised by the Numverify integration. Carries a safe, user-facing
 * category; the original cause is logged server-side only.
 */
export class NumverifyError extends Error {
  readonly code: PhoneErrorCode;

  constructor(code: PhoneErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "NumverifyError";
    this.code = code;
  }
}

function emptyToNull(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeLineType(value: string | null | undefined): LineType | null {
  const normalized = value?.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!normalized) return null;
  return LINE_TYPE_SET.has(normalized) ? (normalized as LineType) : "unknown";
}

/** Maps a Numverify API error code onto one of our safe error categories. */
function mapUpstreamCode(code: number | null | undefined): PhoneErrorCode {
  switch (code) {
    case 101:
      return "NOT_CONFIGURED";
    case 104:
    case 106:
      return "RATE_LIMITED";
    default:
      return "UPSTREAM_ERROR";
  }
}

function getApiKey(): string {
  const apiKey = process.env.NUMVERIFY_API_KEY?.trim();
  if (!apiKey) {
    throw new NumverifyError("NOT_CONFIGURED", "NUMVERIFY_API_KEY is not set.");
  }
  return apiKey;
}

/**
 * Validates a phone number through Numverify and returns a normalized result.
 *
 * Server-only: the API key is read from `process.env` and never leaves this
 * module or the machine.
 *
 * @param phoneNumber Sanitized international number, e.g. `+212600000000`.
 */
export async function validatePhoneNumber(
  phoneNumber: string,
): Promise<PhoneValidationResult> {
  const apiKey = getApiKey();
  const url = new URL(NUMVERIFY_ENDPOINT);
  url.searchParams.set("access_key", apiKey);
  url.searchParams.set("number", phoneNumber);
  url.searchParams.set("format", "json");

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const isTimeout =
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    throw new NumverifyError(
      "UPSTREAM_UNAVAILABLE",
      isTimeout
        ? `Numverify request timed out after ${REQUEST_TIMEOUT_MS}ms.`
        : "Numverify request failed.",
      { cause: error },
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new NumverifyError(
      "UPSTREAM_UNAVAILABLE",
      `Numverify returned a non-JSON response (HTTP ${response.status}).`,
      { cause: error },
    );
  }

  if (response.status === 429) {
    throw new NumverifyError("RATE_LIMITED", "Numverify rate limit reached.", {
      cause: payload,
    });
  }

  if (!response.ok) {
    throw new NumverifyError(
      "UPSTREAM_UNAVAILABLE",
      `Numverify responded with HTTP ${response.status}.`,
      { cause: payload },
    );
  }

  const errorPayload = numverifyErrorSchema.safeParse(payload);
  if (errorPayload.success) {
    const upstream = errorPayload.data.error;
    throw new NumverifyError(
      mapUpstreamCode(upstream?.code),
      `Numverify error ${upstream?.code ?? "unknown"} (${upstream?.type ?? "unknown"}).`,
      { cause: payload },
    );
  }

  const lookup = numverifyLookupSchema.safeParse(payload);
  if (!lookup.success) {
    throw new NumverifyError("UPSTREAM_ERROR", "Unexpected Numverify response shape.", {
      cause: lookup.error,
    });
  }

  const data = lookup.data;
  const international = emptyToNull(data.international_format);

  return {
    valid: data.valid,
    phoneNumber: international ?? emptyToNull(data.number) ?? phoneNumber,
    country: {
      name: emptyToNull(data.country_name),
      code: emptyToNull(data.country_code),
      prefix: emptyToNull(data.country_prefix),
    },
    location: emptyToNull(data.location),
    carrier: emptyToNull(data.carrier),
    lineType: data.valid ? normalizeLineType(data.line_type) : null,
    formats: {
      local: emptyToNull(data.local_format),
      international,
    },
    checkedAt: new Date().toISOString(),
  };
}
