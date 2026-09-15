-- ============================================================
-- RBAC SCHEMA UPDATE
-- Run this ONCE after schema.sql to add user profiles + roles
-- ============================================================

-- ============================================================
-- PROFILES (linked to auth.users)
-- ============================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null default 'technician'
               check (role in ('admin', 'technician', 'viewer')),
  display_name text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ============================================================
-- HELPER: user_role()
-- Returns the caller's role from profiles, or 'viewer' if none.
-- ============================================================
create or replace function public.user_role()
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'viewer'
  );
$$;

-- ============================================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- Every new user gets the baseline 'viewer' role. The role is
-- NEVER read from client-supplied metadata (prevents
-- self-privilege-escalation). Admins promote users afterwards via a
-- manual UPDATE on public.profiles.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    'viewer',
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS POLICIES (drop old anon policies, add auth-based ones)
-- ============================================================

-- --- ASSETS ------------------------------------------------
drop policy if exists "assets_anon_select" on public.assets;
drop policy if exists "assets_anon_insert" on public.assets;
drop policy if exists "assets_anon_update" on public.assets;
drop policy if exists "assets_anon_delete" on public.assets;

drop policy if exists "assets_select" on public.assets;
create policy "assets_select"
  on public.assets for select
  using (auth.uid() is not null);

drop policy if exists "assets_insert" on public.assets;
create policy "assets_insert"
  on public.assets for insert
  with check (public.user_role() in ('admin', 'technician'));

drop policy if exists "assets_update" on public.assets;
create policy "assets_update"
  on public.assets for update
  using (public.user_role() in ('admin', 'technician'))
  with check (public.user_role() in ('admin', 'technician'));

drop policy if exists "assets_delete" on public.assets;
create policy "assets_delete"
  on public.assets for delete
  using (public.user_role() = 'admin');

-- --- PORTS -------------------------------------------------
drop policy if exists "ports_anon_select" on public.ports;
drop policy if exists "ports_anon_insert" on public.ports;
drop policy if exists "ports_anon_update" on public.ports;
drop policy if exists "ports_anon_delete" on public.ports;

drop policy if exists "ports_select" on public.ports;
create policy "ports_select"
  on public.ports for select
  using (auth.uid() is not null);

drop policy if exists "ports_insert" on public.ports;
create policy "ports_insert"
  on public.ports for insert
  with check (public.user_role() in ('admin', 'technician'));

drop policy if exists "ports_update" on public.ports;
create policy "ports_update"
  on public.ports for update
  using (public.user_role() in ('admin', 'technician'))
  with check (public.user_role() in ('admin', 'technician'));

drop policy if exists "ports_delete" on public.ports;
create policy "ports_delete"
  on public.ports for delete
  using (public.user_role() = 'admin');

-- --- CABLES ------------------------------------------------
drop policy if exists "cables_anon_select" on public.cables;
drop policy if exists "cables_anon_insert" on public.cables;
drop policy if exists "cables_anon_update" on public.cables;
drop policy if exists "cables_anon_delete" on public.cables;

drop policy if exists "cables_select" on public.cables;
create policy "cables_select"
  on public.cables for select
  using (auth.uid() is not null);

drop policy if exists "cables_insert" on public.cables;
create policy "cables_insert"
  on public.cables for insert
  with check (public.user_role() in ('admin', 'technician'));

drop policy if exists "cables_update" on public.cables;
create policy "cables_update"
  on public.cables for update
  using (public.user_role() in ('admin', 'technician'))
  with check (public.user_role() in ('admin', 'technician'));

drop policy if exists "cables_delete" on public.cables;
create policy "cables_delete"
  on public.cables for delete
  using (public.user_role() = 'admin');

-- --- MAINTENANCE LOGS --------------------------------------
drop policy if exists "maintenance_anon_select" on public.maintenance_logs;
drop policy if exists "maintenance_anon_insert" on public.maintenance_logs;
drop policy if exists "maintenance_anon_update" on public.maintenance_logs;
drop policy if exists "maintenance_anon_delete" on public.maintenance_logs;

drop policy if exists "maintenance_select" on public.maintenance_logs;
create policy "maintenance_select"
  on public.maintenance_logs for select
  using (auth.uid() is not null);

drop policy if exists "maintenance_insert" on public.maintenance_logs;
create policy "maintenance_insert"
  on public.maintenance_logs for insert
  with check (public.user_role() in ('admin', 'technician'));

drop policy if exists "maintenance_update" on public.maintenance_logs;
create policy "maintenance_update"
  on public.maintenance_logs for update
  using (public.user_role() in ('admin', 'technician'))
  with check (public.user_role() in ('admin', 'technician'));

drop policy if exists "maintenance_delete" on public.maintenance_logs;
create policy "maintenance_delete"
  on public.maintenance_logs for delete
  using (public.user_role() = 'admin');

-- --- PROFILES ----------------------------------------------
-- Users can read their own profile; admins can read any profile.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
  on public.profiles for select
  using (id = auth.uid() or public.user_role() = 'admin');

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert"
  on public.profiles for insert
  with check (public.user_role() = 'admin');

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  using (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

-- No self-update policy: users must NOT be able to mutate their own
-- profile (which would allow role escalation). Only admins update roles.

drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete"
  on public.profiles for delete
  using (public.user_role() = 'admin');

-- ============================================================
-- GRANTS (remove anon, keep authenticated)
-- ============================================================
revoke all on public.assets           from anon;
revoke all on public.ports            from anon;
revoke all on public.cables           from anon;
revoke all on public.maintenance_logs from anon;
revoke all on public.profiles         from anon;

grant select, insert, update, delete on
  public.assets,
  public.ports,
  public.cables,
  public.maintenance_logs
to authenticated;

grant select on public.profiles to authenticated;

-- ============================================================
-- SEED ADMIN USER
-- 1. Create your first user (via the /signup page or Supabase Auth).
--    Every new user automatically becomes 'viewer'.
-- 2. In the Supabase SQL Editor, find their UUID:
--      select id, email from auth.users;
-- 3. Promote that user to admin (and/or technicians):
--      update public.profiles set role = 'admin' where id = '<user-uuid>';
--      update public.profiles set role = 'technician' where id = '<user-uuid>';
-- ============================================================

-- ============================================================
-- INSTITUTIONAL PERMISSION MATRIX (enforced by RLS above and by
-- the frontend role guards in app/page.tsx, app/connections/page.tsx,
-- app/maintenance/page.tsx, app/components/Header.tsx)
--
--   ROLE       | ASSETS                     | PORTS/CABLES             | MAINTENANCE LOGS        | PROFILES
--   -----------+----------------------------+--------------------------+-------------------------+------------------
--   admin      | view/add/edit/delete       | view/add/edit/delete     | view/add/edit/delete    | view/update (roles)
--   technician | view/add/edit (no delete)  | view/add/edit (no delete)| view/add (no delete)    | view own
--   viewer     | view only                  | view only                | view only               | view own
--
-- RLS: SELECT = any authenticated user; INSERT/UPDATE =
-- admin + technician; DELETE = admin only. Profiles UPDATE = admin only.
-- ============================================================