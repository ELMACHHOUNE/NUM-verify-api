import type { LineType } from "@/types/phone";

/** Human-readable label for a Numverify line type. */
const LINE_TYPE_LABELS: Record<LineType, string> = {
  mobile: "Mobile",
  landline: "Landline",
  voip: "VoIP",
  toll_free: "Toll free",
  premium_rate: "Premium rate",
  shared_cost: "Shared cost",
  personal_number: "Personal number",
  pager: "Pager",
  uan: "UAN",
  voicemail: "Voicemail",
  special_services: "Special services",
  unknown: "Unknown",
};

export function formatLineType(lineType: LineType | null): string {
  if (!lineType) return "Not available";
  return LINE_TYPE_LABELS[lineType] ?? "Unknown";
}

/** "Country · Line type" summary used by the history list. */
export function formatCountryAndLineType(
  countryName: string | null,
  lineType: LineType | null,
): string {
  const parts = [countryName ?? "Unknown country"];
  if (lineType) parts.push(formatLineType(lineType));
  return parts.join(" · ");
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Formats an ISO timestamp for display, falling back to the raw value. */
export function formatCheckedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return dateTimeFormatter.format(date);
}

/** Placeholder shown when the plan does not expose a field (e.g. carrier). */
export const UNAVAILABLE_LABEL = "Not available";
