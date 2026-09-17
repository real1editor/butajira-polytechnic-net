/**
 * Centralized environment access + startup validation.
 *
 * IMPORTANT: reads are written as STATIC `process.env.NEXT_PUBLIC_*` references.
 * Next.js / Turbopack inlines static process.env reads into browser and edge
 * (middleware) bundles at build time — a dynamic `process.env[key]` access would
 * silently evaluate to `undefined` in the client bundle. Keep it static.
 */

const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function requireEnv(value: string | undefined, key: string): string {
  if (!value || value.trim() === "") {
    throw new Error(
      [
        `Missing required environment variable: ${key}`,
        "",
        "Add these to your .env.local file (or hosting provider), then restart:",
        "  NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co",
        "  NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>",
        "",
        "Grab both from: Supabase Dashboard → Project Settings → API.",
      ].join("\n")
    );
  }
  return value.trim();
}

/** Base URL of the Supabase project (static, now validated). */
export const supabaseUrl = requireEnv(
  NEXT_PUBLIC_SUPABASE_URL,
  "NEXT_PUBLIC_SUPABASE_URL"
);

/** Public anon key of the Supabase project (safe for the browser). */
export const supabaseAnonKey = requireEnv(
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
);