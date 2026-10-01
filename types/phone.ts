/**
 * Shared phone-validation domain types.
 *
 * `PhoneValidationResult` is the normalized shape the UI consumes. It is
 * deliberately decoupled from the raw Numverify response so the frontend stays
 * independent of the external API structure.
 */

export const LINE_TYPES = [
  "mobile",
  "landline",
  "voip",
  "toll_free",
  "premium_rate",
  "shared_cost",
  "personal_number",
  "pager",
  "uan",
  "voicemail",
  "special_services",
  "unknown",
] as const;

export type LineType = (typeof LINE_TYPES)[number];

export interface PhoneCountry {
  name: string | null;
  code: string | null;
  prefix: string | null;
}

export interface PhoneFormats {
  local: string | null;
  international: string | null;
}

export interface PhoneValidationResult {
  valid: boolean;
  phoneNumber: string;
  country: PhoneCountry;
  location: string | null;
  carrier: string | null;
  lineType: LineType | null;
  formats: PhoneFormats;
  checkedAt: string;
}

/** Machine-readable failure reasons returned by `/api/phone/validate`. */
export const PHONE_ERROR_CODES = [
  "INVALID_REQUEST",
  "NOT_CONFIGURED",
  "RATE_LIMITED",
  "UPSTREAM_UNAVAILABLE",
  "UPSTREAM_ERROR",
  "INTERNAL_ERROR",
] as const;

export type PhoneErrorCode = (typeof PHONE_ERROR_CODES)[number];

export interface PhoneValidationSuccessResponse {
  success: true;
  data: PhoneValidationResult;
}

export interface PhoneValidationErrorResponse {
  success: false;
  error: string;
  code: PhoneErrorCode;
}

export type PhoneValidationResponse =
  | PhoneValidationSuccessResponse
  | PhoneValidationErrorResponse;

/** A single locally stored lookup, persisted in `localStorage` only. */
export interface HistoryEntry {
  id: string;
  phoneNumber: string;
  countryName: string | null;
  countryCode: string | null;
  lineType: LineType | null;
  carrier: string | null;
  location: string | null;
  valid: boolean;
  checkedAt: string;
}
