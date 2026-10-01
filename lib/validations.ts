import { z } from "zod";

import { getCountry, getDefaultCountry, type Country } from "@/lib/countries";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import { DEVICE_TYPES, VISITOR_SORT_FIELDS } from "@/types/analytics";
import { USER_ROLES, type AuthErrorCode } from "@/types/auth";

/** Minimum/maximum plausible digit counts for a full international number. */
const MIN_DIGITS = 4;
const MAX_DIGITS = 15;

/** Characters a user may legitimately type into a phone field. */
const ALLOWED_CHARACTERS = /^[\d+\s().-]+$/;

/** Digits only, used for length checks. */
export function countDigits(value: string): number {
  return value.replace(/\D/g, "").length;
}

/**
 * Strips formatting characters and normalizes the international prefix so the
 * value sent to the lookup API is a clean E.164-ish string.
 *
 * `+212 6 00 00 00 00` -> `+212600000000`
 * `00212 6 00 00 00 00` -> `+212600000000`
 */
export function sanitizePhoneNumber(value: string): string {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (hasPlus) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  return digits;
}

/**
 * Drops the national trunk prefix from a national number so it can be joined to
 * a dial code, e.g. UK `07911 123456` -> `7911123456`.
 */
export function stripTrunkPrefix(country: Country, value: string): string {
  const { trunkPrefix } = country;
  if (!trunkPrefix || !value.startsWith(trunkPrefix)) return value;

  const stripped = value.slice(trunkPrefix.length);
  return countDigits(stripped) >= MIN_DIGITS ? stripped : value;
}

/**
 * Builds the number that will be looked up from the selected country and the
 * raw input. When the user already types an international prefix (`+` or `00`)
 * the selected country dial code is ignored.
 */
export function buildInternationalNumber(countryIso2: string, value: string): string {
  const trimmed = value.trim();
  const isInternational =
    trimmed.startsWith("+") || trimmed.replace(/\D/g, "").startsWith("00");
  if (isInternational) return sanitizePhoneNumber(trimmed);

  const country = getCountry(countryIso2) ?? getDefaultCountry();
  return sanitizePhoneNumber(`${country.dialCode}${stripTrunkPrefix(country, trimmed)}`);
}

/**
 * Schema for the number accepted by `/api/phone/validate`.
 *
 * Deliberately permissive: it rejects obviously malformed input only. The
 * Numverify API remains the source of truth for real-world validity.
 */
export const phoneNumberSchema = z
  .string({ error: "Please enter a valid phone number." })
  .trim()
  .min(1, { error: "Please enter a phone number." })
  .max(32, { error: "This phone number is too long." })
  .refine((value) => ALLOWED_CHARACTERS.test(value), {
    error: "Use digits only, optionally with +, spaces, hyphens or parentheses.",
  })
  .transform((value) => sanitizePhoneNumber(value))
  .refine((value) => countDigits(value) >= MIN_DIGITS, {
    error: `Enter at least ${MIN_DIGITS} digits.`,
  })
  .refine((value) => countDigits(value) <= MAX_DIGITS, {
    error: `International numbers cannot exceed ${MAX_DIGITS} digits.`,
  });

export const validatePhoneNumberRequestSchema = z.object({
  phoneNumber: phoneNumberSchema,
});

export type ValidatePhoneNumberRequest = z.infer<typeof validatePhoneNumberRequestSchema>;

/** Schema backing the client-side analyzer form. */
export const phoneFormSchema = z
  .object({
    country: z.string().min(1, { error: "Select a country." }),
    number: z
      .string()
      .trim()
      .min(1, { error: "Please enter a phone number." })
      .max(32, { error: "This phone number is too long." }),
  })
  .superRefine((values, ctx) => {
    if (!values.number) return;

    const result = phoneNumberSchema.safeParse(
      buildInternationalNumber(values.country, values.number),
    );
    if (result.success) return;

    const message = result.error.issues[0]?.message ?? "Please enter a valid phone number.";
    ctx.addIssue({ code: "custom", path: ["number"], message });
  });

export type PhoneFormValues = z.infer<typeof phoneFormSchema>;

/** Friendly, user-facing copy for every error the API can produce. */
export const PHONE_ERROR_MESSAGES = {
  INVALID_REQUEST: "Please enter a valid phone number.",
  NOT_CONFIGURED: "Phone validation service is not configured.",
  RATE_LIMITED: "Too many requests. Please try again later.",
  UPSTREAM_UNAVAILABLE:
    "The validation service is temporarily unavailable. Please try again later.",
  UPSTREAM_ERROR: "Unable to validate phone number.",
  INTERNAL_ERROR: "Unable to validate phone number.",
} as const satisfies Record<string, string>;

/* -------------------------------------------------------------------------- */
/* Accounts & authentication                                                    */
/* -------------------------------------------------------------------------- */

const emailSchema = z
  .email({ error: "Enter a valid email address." })
  .max(254, { error: "This email address is too long." });

const nameSchema = z
  .string({ error: "Enter your name." })
  .trim()
  .min(2, { error: "Enter your name." })
  .max(80, { error: "Your name is too long." });

/**
 * Password strength: length is the dominant factor, so the floor is 10
 * characters rather than a symbol-class rule that pushes people toward
 * `Password1!`. The bounds live in `lib/password-policy.ts` so the client forms
 * enforce exactly the same rule.
 */
const passwordSchema = z
  .string({ error: "Enter a password." })
  .min(MIN_PASSWORD_LENGTH, {
    error: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
  })
  .max(MAX_PASSWORD_LENGTH, { error: "This password is too long." });

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterRequest = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  // No length floor here: an existing account may predate the current policy, and
  // rejecting the request before hashing would leak nothing but costs a lookup.
  password: z
    .string({ error: "Enter your password." })
    .min(1, { error: "Enter your password." })
    .max(MAX_PASSWORD_LENGTH, { error: "This password is too long." }),
});

export type LoginRequest = z.infer<typeof loginSchema>;

/** Admin-only role/active changes. Both fields are optional for partial patches. */
export const updateUserSchema = z
  .object({
    role: z.enum(USER_ROLES).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => value.role !== undefined || value.isActive !== undefined, {
    message: "Provide a role or an active state to change.",
  });

export type UpdateUserRequest = z.infer<typeof updateUserSchema>;

export const AUTH_ERROR_MESSAGES = {
  INVALID_REQUEST: "Check the details and try again.",
  NOT_CONFIGURED: "Authentication is not configured.",
  INVALID_CREDENTIALS: "Incorrect email or password.",
  EMAIL_TAKEN: "An account with that email already exists.",
  ACCOUNT_DISABLED: "This account has been deactivated.",
  RATE_LIMITED: "Too many attempts. Please wait a few minutes.",
  UNAUTHENTICATED: "Sign in to continue.",
  FORBIDDEN: "You do not have access to this page.",
  LAST_ADMIN: "At least one active administrator must remain.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
} as const satisfies Record<AuthErrorCode, string>;

/* -------------------------------------------------------------------------- */
/* Analytics                                                                    */
/* -------------------------------------------------------------------------- */

/** Body accepted by the public `/api/analytics/track` endpoint. */
export const trackPageSchema = z.object({
  page: z
    .string({ error: "A page path is required." })
    .trim()
    .min(1, { error: "A page path is required." })
    .max(256, { error: "This page path is too long." })
    .refine((value) => value.startsWith("/"), {
      error: "The page path must start with '/'.",
    })
    .refine((value) => !value.includes(".."), {
      error: "The page path is not valid.",
    }),
  referrer: z
    .string()
    .trim()
    .max(512, { error: "This referrer is too long." })
    .optional(),
});

export type TrackPageRequest = z.infer<typeof trackPageSchema>;

export const TRACK_ERROR_MESSAGES = {
  INVALID_REQUEST: "Invalid tracking request.",
  DISABLED: "Visitor tracking is currently disabled.",
  RATE_LIMITED: "Too many tracking requests.",
  INTERNAL_ERROR: "Unable to record this visit.",
} as const;

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

const dateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Use a YYYY-MM-DD date." })
  .optional();

/**
 * Query string accepted by `/admin/visitors` and the matching admin API route.
 * Every value is bounded so a crafted query cannot become a heavy scan.
 */
export const visitorQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(80, { error: "Search terms are limited to 80 characters." })
    .optional(),
  country: z.string().trim().max(8).optional(),
  city: z.string().trim().max(120).optional(),
  device: z.enum(DEVICE_TYPES).optional(),
  browser: z.string().trim().max(60).optional(),
  os: z.string().trim().max(60).optional(),
  range: z
    .enum(["today", "yesterday", "last7", "last30", "thisYear", "allTime", "custom"])
    .optional(),
  from: dateStringSchema,
  to: dateStringSchema,
  sort: z.enum(VISITOR_SORT_FIELDS).optional(),
  direction: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional(),
});

export type VisitorQueryInput = z.infer<typeof visitorQuerySchema>;

/** Body accepted by `PATCH /api/admin/settings`. */
export const appSettingsSchema = z.object({
  visitorTracking: z.boolean(),
  trackPageViews: z.boolean(),
  trackReferrer: z.boolean(),
  dataRetentionDays: z.union([z.literal(30), z.literal(90), z.literal(180), z.literal(365)]),
  activeWindowMinutes: z.union([
    z.literal(1),
    z.literal(5),
    z.literal(15),
    z.literal(30),
  ]),
});

export type AppSettingsInput = z.infer<typeof appSettingsSchema>;
