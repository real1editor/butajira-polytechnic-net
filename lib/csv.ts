export type CsvValue = string | number | boolean | null | undefined;

/**
 * Escapes one CSV cell and neutralizes spreadsheet formula injection.
 *
 * User-controlled strings beginning with `=`, `+`, `-`, `@`, tab or CR are
 * prefixed with an apostrophe so Excel/Sheets treat them as text. Numbers and
 * booleans are left untouched so negative values stay numeric.
 */
export function escapeCell(value: CsvValue): string {
  if (value == null) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
