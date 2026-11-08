-- ============================================================
-- RLS POSTURE VERIFICATION
-- Read-only checks. Run in the Supabase SQL Editor after applying
-- schema.sql, schema-rbac.sql and schema-audit.sql.
-- Raises an exception on the first missing policy or over-broad grant.
-- ============================================================

do $$
declare
  table_name text;
  policy record;
begin
  foreach table_name in array array[
    'profiles',
    'assets',
    'ports',
    'cables',
    'maintenance_logs',
    'audit_logs'
  ] loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = table_name
        and c.relrowsecurity
    ) then
      raise exception 'RLS is not enabled on public.%', table_name;
    end if;
  end loop;

  for policy in
    select *
    from jsonb_to_recordset(
      '[
        {"tablename":"assets","policyname":"assets_select"},
        {"tablename":"assets","policyname":"assets_insert"},
        {"tablename":"assets","policyname":"assets_update"},
        {"tablename":"assets","policyname":"assets_delete"},
        {"tablename":"ports","policyname":"ports_select"},
        {"tablename":"ports","policyname":"ports_insert"},
        {"tablename":"ports","policyname":"ports_update"},
        {"tablename":"ports","policyname":"ports_delete"},
        {"tablename":"cables","policyname":"cables_select"},
        {"tablename":"cables","policyname":"cables_insert"},
        {"tablename":"cables","policyname":"cables_update"},
        {"tablename":"cables","policyname":"cables_delete"},
        {"tablename":"maintenance_logs","policyname":"maintenance_select"},
        {"tablename":"maintenance_logs","policyname":"maintenance_insert"},
        {"tablename":"maintenance_logs","policyname":"maintenance_update"},
        {"tablename":"maintenance_logs","policyname":"maintenance_delete"},
        {"tablename":"profiles","policyname":"profiles_select"},
        {"tablename":"profiles","policyname":"profiles_insert"},
        {"tablename":"profiles","policyname":"profiles_update_admin"},
        {"tablename":"profiles","policyname":"profiles_delete"},
        {"tablename":"audit_logs","policyname":"audit_logs_select_admin"}
      ]'::jsonb
    ) as expected(tablename text, policyname text)
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = policy.tablename
        and policyname = policy.policyname
    ) then
      raise exception 'Missing RLS policy % on public.%',
        policy.policyname, policy.tablename;
    end if;
  end loop;

  -- The audit trail must remain append-only at the API surface.
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ) then
    raise exception 'audit_logs must not expose a write policy';
  end if;

  foreach table_name in array array[
    'profiles',
    'assets',
    'ports',
    'cables',
    'maintenance_logs',
    'audit_logs'
  ] loop
    if has_table_privilege('anon', format('public.%I', table_name), 'SELECT') then
      raise exception 'anon still has SELECT on public.%', table_name;
    end if;
    if not has_table_privilege(
      'authenticated', format('public.%I', table_name), 'SELECT'
    ) then
      raise exception 'authenticated lost SELECT on public.%', table_name;
    end if;
  end loop;

  raise notice 'RLS posture OK: tables, policies and grants are locked down.';
end $$;
