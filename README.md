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

2. Create `.env.local` from the template:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   ```

3. Run the app:

   ```bash
   npm run dev      # development
   npm run build    # production build (also validates the proxy middleware)
   npm run lint     # eslint
   ```

## Database Setup

Apply the SQL files **in order** from the Supabase SQL Editor (or `supabase db push`):

| Order | File            | Purpose                                                        |
| ----- | --------------- | -------------------------------------------------------------- |
| 1     | `reset.sql`     | Optional — wipes all data for a clean slate                    |
| 2     | `schema.sql`    | Core tables (`assets`, `ports`, `cables`, `maintenance_logs`), auto-port trigger, full-text search-friendly design. Enables RLS (deny-by-default) |
| 3     | `schema-rbac.sql` | `profiles` table, Auth signup trigger, role-based RLS policies, grants, Realtime |
| 4     | `schema-audit.sql` | Audit logging (`audit_logs` + triggers), optimization indexes, port-exclusivity invariant, `v_asset_summary` RLS hardening |

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

## Routes

| Route          | Access            | Description                                  |
| -------------- | ----------------- | -------------------------------------------- |
| `/`            | any authenticated | Dashboard, asset list, stat cards & analytics|
| `/connections` | any authenticated | Port-to-port cable mapping                   |
| `/maintenance` | any authenticated | Maintenance log history                      |
| `/admin/users` | admin only        | User role management                         |
| `/admin/audit` | admin only        | Immutable audit trail of all mutations       |
| `/login`, `/signup` | public        | Authentication                               |
| `/forgot-password` | public        | Request a password reset email               |
| `/update-password` | public        | Set a new password from the recovery link    |