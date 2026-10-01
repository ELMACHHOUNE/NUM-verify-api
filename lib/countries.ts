/**
 * Country reference data for the analyzer form.
 *
 * Add new entries to `COUNTRIES` and they automatically appear in the selector.
 *
 * - `dialCode` follows E.164 and always includes the leading `+`.
 * - `trunkPrefix` is the national dialling prefix that must be dropped when
 *   converting a national number to international format (E.164 §3.1.2). Use
 *   `""` for countries where a leading zero is a significant digit, e.g. Italy
 *   (`06 1234 5678` -> `+39 06 1234 5678`) and Spain (no trunk prefix).
 * - `example` is a sample national number used as the input placeholder.
 */

export interface Country {
  /** ISO 3166-1 alpha-2 code, e.g. `MA`. */
  iso2: string;
  name: string;
  /** E.164 dial code including the leading `+`, e.g. `+212`. */
  dialCode: string;
  /** National trunk prefix dropped in international format, or `""`. */
  trunkPrefix: string;
  /** Sample national number (without dial code) used as placeholder text. */
  example: string;
}

export const COUNTRIES: readonly Country[] = [
  { iso2: "MA", name: "Morocco", dialCode: "+212", trunkPrefix: "0", example: "600000000" },
  { iso2: "FR", name: "France", dialCode: "+33", trunkPrefix: "0", example: "612345678" },
  { iso2: "US", name: "United States", dialCode: "+1", trunkPrefix: "", example: "4155552671" },
  { iso2: "CA", name: "Canada", dialCode: "+1", trunkPrefix: "", example: "4165552671" },
  {
    iso2: "GB",
    name: "United Kingdom",
    dialCode: "+44",
    trunkPrefix: "0",
    example: "7911123456",
  },
  { iso2: "ES", name: "Spain", dialCode: "+34", trunkPrefix: "", example: "612345678" },
  { iso2: "DE", name: "Germany", dialCode: "+49", trunkPrefix: "0", example: "15123456789" },
  { iso2: "IT", name: "Italy", dialCode: "+39", trunkPrefix: "", example: "3123456789" },
  { iso2: "BE", name: "Belgium", dialCode: "+32", trunkPrefix: "0", example: "470123456" },
  {
    iso2: "NL",
    name: "Netherlands",
    dialCode: "+31",
    trunkPrefix: "0",
    example: "612345678",
  },
] as const;

export const DEFAULT_COUNTRY_ISO2 = "MA";

export function getCountry(iso2: string): Country | undefined {
  return COUNTRIES.find((country) => country.iso2 === iso2);
}

export function getDefaultCountry(): Country {
  return getCountry(DEFAULT_COUNTRY_ISO2) ?? COUNTRIES[0];
}

/** Builds a flag emoji from an ISO alpha-2 code using regional indicator symbols. */
export function countryFlag(iso2: string | null | undefined): string {
  if (typeof iso2 !== "string" || !/^[A-Za-z]{2}$/.test(iso2)) return "🌐";
  const base = 0x1f1e6;
  return String.fromCodePoint(
    ...[iso2.toUpperCase()].map((char) => base + (char.charCodeAt(0) - 65)),
  );
}
