/**
 * CSV serialisation for the admin export.
 *
 * Values are quoted defensively so a hostile ISP name or page path can never
 * break out of its column and inject extra cells.
 */

const NEEDS_QUOTING = /[",\r\n]/;

/** Escapes a single cell (RFC 4180). */
export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    return escapeCsvValue(JSON.stringify(value));
  }

  const text = String(value);
  return NEEDS_QUOTING.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Serialises rows to CSV with CRLF line endings.
 *
 * @param columns Column keys in output order; also used as the header row.
 */
export function toCsv<T extends object>(
  columns: readonly (keyof T & string)[],
  rows: readonly T[],
): string {
  const header = columns.join(",");
  const body = rows.map((row) =>
    columns
      .map((column) => escapeCsvValue((row as Record<string, unknown>)[column]))
      .join(","),
  );
  return [header, ...body].join("\r\n");
}
