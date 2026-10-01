import { NextResponse } from "next/server";

import { NumverifyError, validatePhoneNumber } from "@/lib/numverify";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { PHONE_ERROR_MESSAGES, validatePhoneNumberRequestSchema } from "@/lib/validations";
import type {
  PhoneErrorCode,
  PhoneValidationErrorResponse,
  PhoneValidationSuccessResponse,
} from "@/types/phone";

const MAX_BODY_BYTES = 4_096;

const STATUS_BY_CODE: Record<PhoneErrorCode, number> = {
  INVALID_REQUEST: 400,
  NOT_CONFIGURED: 500,
  RATE_LIMITED: 429,
  UPSTREAM_UNAVAILABLE: 502,
  UPSTREAM_ERROR: 422,
  INTERNAL_ERROR: 500,
};

function errorResponse(code: PhoneErrorCode): NextResponse<PhoneValidationErrorResponse> {
  return NextResponse.json(
    { success: false, error: PHONE_ERROR_MESSAGES[code], code },
    { status: STATUS_BY_CODE[code], headers: { "Cache-Control": "no-store" } },
  );
}

function isJsonRequest(request: Request): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.includes("application/json");
}

export async function POST(request: Request): Promise<Response> {
  const { limited, retryAfterSeconds } = checkRateLimit(getClientKey(request));
  if (limited) {
    return NextResponse.json(
      { success: false, error: PHONE_ERROR_MESSAGES.RATE_LIMITED, code: "RATE_LIMITED" },
      {
        status: STATUS_BY_CODE.RATE_LIMITED,
        headers: { "Retry-After": String(retryAfterSeconds), "Cache-Control": "no-store" },
      },
    );
  }

  if (!isJsonRequest(request)) {
    return errorResponse("INVALID_REQUEST");
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return errorResponse("INVALID_REQUEST");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_REQUEST");
  }

  const parsed = validatePhoneNumberRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("INVALID_REQUEST");
  }

  try {
    const data = await validatePhoneNumber(parsed.data.phoneNumber);
    const payload: PhoneValidationSuccessResponse = { success: true, data };
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof NumverifyError) {
      console.error(`[phone/validate] ${error.code}: ${error.message}`, error.cause ?? "");
      return errorResponse(error.code);
    }

    console.error("[phone/validate] Unexpected failure", error);
    return errorResponse("INTERNAL_ERROR");
  }
}
