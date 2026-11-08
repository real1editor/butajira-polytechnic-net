# Butajira Polytechnic — Network Asset & Cable Infrastructure Management

A Role-Based Access Control (RBAC) system for tracking network assets, port mappings,
patch cables, and maintenance work at Butajira Polytechnic College. Built with
**Next.js (App Router)**, **Supabase** (Postgres + Auth), and **Tailwind CSS**.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript + Turbopack
- **Backend:** Supabase — Postgres schema with Row Level Security (RLS), Auth, Realtime
- **Styling:** Tailwind CSS 4

## Prerequisites

- Node.js 20+
- A Supabase project (URL + anon key)

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from the committed template:

   ```bash
   copy .env.example .env.local
   ```

   Then fill in your Supabase project values:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   # Optional: absolute URL used for OpenGraph/canonical metadata.
   NEXT_PUBLIC_SITE_URL=https://<your-domain>
   ```

3. Run the app:

   ```bash
   npm run dev        # development
   npm run build      # production build (also validates the proxy middleware)
   npm run start      # serve the production build
   npm run lint       # eslint
   npm run typecheck  # tsc --noEmit
   npm test           # Vitest unit tests
   npm run test:e2e   # Playwright smoke tests (build first)
   ```

## Database Setup

Apply the SQL files **in order** from the Supabase SQL Editor (or `supabase db push`):

| Order | File            | Purpose                                                        |
| ----- | --------------- | -------------------------------------------------------------- |
| 1     | `reset.sql`     | Optional — wipes all data for a clean slate                    |
| 2     | `schema.sql`    | Core tables (`assets`, `ports`, `cables`, `maintenance_logs`), auto-port trigger, full-text search-friendly design. Enables RLS (deny-by-default) |
| 3     | `schema-rbac.sql` | `profiles` table, Auth signup trigger, role-based RLS policies, grants, Realtime |
| 4     | `schema-audit.sql` | Audit logging (`audit_logs` + triggers), optimization indexes, port-exclusivity invariant, `v_asset_summary` RLS hardening |
| 5     | `rls-verify.sql` | Read-only check: fails loudly if RLS, a policy, or a grant is missing |

`schema-rbac.sql` is idempotent and can also be re-run on an existing install to
upgrade from the legacy open (anon) policies. A **backfill** statement is included
for users who signed up before this migration was applied.

`schema-audit.sql` is also idempotent. Run it once after `schema-rbac.sql` to
record an immutable audit trail of every mutation and add the search/join
indexes. It closes an RLS gap: `v_asset_summary` is switched to
`security invoker` so it can never bypass RLS, and `anon` loses SELECT on it.

### Promoting your first admin

Every new sign-up is automatically assigned the lowest-privilege `viewer` role by a
database trigger. **The role is never read from client-supplied metadata**, so a user
cannot self-promote. To bootstrap an admin:

```sql
-- 1. Find the user (or use the new /admin/users page once you have an admin)
select id, email from auth.users;

-- 2. Promote to admin / technician
update public.profiles set role = 'admin' where id = '<user-uuid>';
```

After your first admin exists, subsequent role changes are done in-app under
**Users** (admin-only) and take effect live via Supabase Realtime.

## Role Model & Security

| Role       | Assets | Ports / Cables | Maintenance Logs | Profiles (roles) |
| ---------- | ------ | -------------- | ---------------- | ---------------- |
| **admin**  | CRUD   | CRUD           | CRUD             | view + update    |
| **technician** | Read / Create / Update (no delete) | Read / Create / Update (no delete) | Read / Create / Update (no delete) | read own |
| **viewer** | Read-only | Read-only | Read-only | read own |

Enforcement is layered (defense in depth), never UI-only:

1. **RLS (source of truth)** — every table query is filtered by `user_role()`.
   DELETE is admin-only via policy; INSERT/UPDATE require admin or technician;
   profiles updates require admin. This holds even if someone bypasses the UI.
2. **Proxy middleware** (`proxy.ts`, Next 16's renamed middleware) — refreshes the
   Supabase session on every request, redirects unauthenticated users to `/login`,
   and server-side redirects non-admins away from `/admin/*`.
3. **Client guards** — `<ProtectRole allowedRoles={['admin', 'technician']}>
   ...</ProtectRole>` wraps every mutation form; delete buttons render only for
   admins; viewers see a "Read-only access" notice instead of edit/create forms.

### Where to find things

- `supabase/schema.sql`, `supabase/schema-rbac.sql` — schema + security policies
- `supabase/schema-audit.sql` — audit trail, indexes, port-exclusivity, view hardening
- `lib/supabase/middleware.ts` — session refresh + `/admin` role guard
- `lib/queries.ts` — typed data layer (assets, ports, cables, logs, profiles, audit)
- `lib/validation.ts` — Zod schemas; every mutation is validated before hitting the DB
- `app/contexts/AuthContext.tsx` — session provider, `useUser()` / `usePermissions()`
- `app/contexts/ToastContext.tsx` — global toast system (`useToast()`)
- `app/components/ProtectRole.tsx` — role guards and read-only notices
- `app/admin/users/page.tsx` — admin role management
- `app/admin/audit/page.tsx` — admin-only audit trail viewer

## Audit Logging

Every `INSERT` / `UPDATE` / `DELETE` on `assets`, `ports`, `cables`,
`maintenance_logs`, and `profiles` is captured automatically by a database
trigger into `public.audit_logs` with the actor id, table, action, record id,
and the changed row (before/after) as JSONB.

- RLS: only `admin` can read `audit_logs`; there is **no write policy** and the
  table is **not** published to Realtime.
- Surfaced in-app under **Users → Audit** or **Audit** in the nav for admins.

## Validation

All mutation payloads in `lib/queries.ts` are validated with Zod (`lib/validation.ts`)
before any network call, so malformed input never reaches the API. Forms get a
human-readable message back and users see it immediately.

## Testing

- **Unit tests** (`tests/*.test.ts`, Vitest): validation, permissions, query helpers.
- **E2E smoke tests** (`tests/e2e`, Playwright): dark theme, skip link, metadata,
  manifest, protected-route redirects, health endpoint and static icons.
- Authenticated E2E checks are opt-in: set `E2E_EMAIL` and `E2E_PASSWORD` to a
  real test account before running `npm run test:e2e`. The command expects a
  production build (`npm run build`) and starts `next start` on port 3100 unless
  `PLAYWRIGHT_BASE_URL` points at an already-running deployment.
- CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, build, the
  Playwright smoke suite, and an `npm audit --omit=dev --audit-level=high` gate.

## Operations

- **Health check:** `GET /api/health` returns `{ "status": "ok", ... }` with
  `Cache-Control: no-store`. Point your uptime monitor or container probe at it.
- **Error logging:** `instrumentation.ts` reports unhandled server request
  errors as JSON (route, route type, router, URL, method) through
  `lib/logger.ts`, so platform log collectors can parse them.
- **Search indexing:** the app is an internal console; `/robots.txt` disallows
  all crawlers and pages emit `noindex, nofollow`.
- **Scaling:** the audit viewer is server-paginated (25 rows/page) and filters
  by table/action in SQL; `fetchAuditLogs` is capped at 100 rows per request.
- **Backups:** enable daily automated backups in Supabase (Project Settings →
  Database → Backups) and before running `supabase/reset.sql` in production.
  To restore, use Supabase's point-in-time recovery or restore the latest
  backup, then re-run `schema.sql`, `schema-rbac.sql`, and `schema-audit.sql`
  in that order if the schema was lost.

## Routes

| Route          | Access            | Description                                  |
| -------------- | ----------------- | -------------------------------------------- |
| `/`            | any authenticated | Dashboard, asset list, stat cards & analytics|
| `/topology`    | any authenticated | Interactive force-directed network topology  |
| `/connections` | any authenticated | Port-to-port cable mapping                   |
| `/maintenance` | any authenticated | Maintenance log history                      |
| `/admin/users` | admin only        | User role management                         |
| `/admin/audit` | admin only        | Immutable audit trail of all mutations       |
| `/login`, `/signup` | public        | Authentication                               |
| `/forgot-password` | public        | Request a password reset email               |
| `/update-password` | public        | Set a new password from the recovery link    |