/**
 * Shared date helpers.
 *
 * `log_date` is stored as a plain `YYYY-MM-DD` string and must be treated as a
 * calendar date (local timezone), never as a UTC instant. Using `toISOString()`
 * for "today" shifts the date for timezones east of UTC (e.g. Ethiopia = UTC+3),
 * which caused logs created near midnight to land on the wrong day.
 */

/** Returns today's date in the local timezone as `YYYY-MM-DD`. */
export function todayLocal(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Formats a `YYYY-MM-DD` calendar date for display (never shifted by timezone). */
export function formatDate(iso: string): string {
  try {
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Formats a numeric amount as Ethiopian Birr without trailing noise. */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `ETB ${Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Formats a full ISO datetime string for display. */
export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}