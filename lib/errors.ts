import { z } from "zod";
import { zodMessage } from "@/lib/validation";

const RLS_FRIENDLY: Array<[RegExp, string]> = [
  [
    /violates row.level security/i,
    "You don't have permission to perform this action.",
  ],
  [
    /permission denied for table/i,
    "You don't have permission to access that data.",
  ],
  [
    /permission denied for sequence/i,
    "You don't have permission to create that record.",
  ],
  [
    /permission denied for function/i,
    "Your account role does not allow this operation.",
  ],
  [
    /duplicate key|already exists/i,
    "A record with these details already exists.",
  ],
  [
    /foreign key|still referenced/i,
    "This record is still in use elsewhere and cannot be changed.",
  ],
  [
    /violates not-null|null value in column/i,
    "Some required fields are missing.",
  ],
  [
    /invalid input syntax for type uuid/i,
    "The selected record no longer exists. Refresh and try again.",
  ],
  [
    /network|fetch failed|load failed/i,
    "A network problem interrupted the request. Check your connection.",
  ],
  [/jwt|token.*expired/i, "Your session has expired. Please sign in again."],
];

/**
 * Turn any unknown error into a short user-facing message.
 *
 * Handles:
 *  - Zod validation errors (field-level messages joined)
 *  - Supabase PostgrestError (raw SQL / RLS messages mapped to friendly text)
 *  - plain Error / string / unknown
 */
export function toUserMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (error == null) return fallback;

  if (typeof error === "string") return error.trim() || fallback;

  if (error instanceof z.ZodError) return zodMessage(error);

  const message =
    (error as { message?: unknown } | null)?.message ??
    (error as { error_description?: unknown } | null)?.error_description;

  if (typeof message === "string" && message.trim()) {
    const raw = message.trim();
    for (const [pattern, replacement] of RLS_FRIENDLY) {
      if (pattern.test(raw)) return replacement;
    }
    return raw;
  }

  return fallback;
}

/**
 * Wraps an async operation so that no thrown error ever propagates to the caller.
 * Returns `{ data, error }` instead of throwing.
 */
export async function tryCatch<T>(
  operation: () => Promise<T>,
  fallback?: string
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: toUserMessage(err, fallback) };
  }
}