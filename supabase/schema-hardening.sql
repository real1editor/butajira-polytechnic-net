-- ============================================================
-- HARDENING MIGRATION (run AFTER schema-rbac.sql)
-- 1. Reconcile ports when an asset's type changes (not just on insert)
-- 2. Admin-only decommissioning (soft delete) for assets + cables
-- 3. Last-admin lockout guard
-- Idempotent: safe to re-run on an existing install.
-- ============================================================

-- ============================================================
-- 1. PORT RECONCILIATION
-- ============================================================
create or replace function public.reconcile_asset_ports(
  p_asset_id uuid,
  p_type text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  desired text[];
begin
  if p_type = 'patch_panel' then
    desired := array(select generate_series(1, 48)::text);
  elsif p_type = 'switch' then
    desired := array(select generate_series(1, 24)::text);
  else
    desired := array['WAN', 'LAN'];
  end if;

  -- Remove ports that no longer belong to this type, but never touch a port
  -- that is still used by a cable (that would cascade-delete the cable).
  delete from public.ports p
  where p.asset_id = p_asset_id
    and not (p.port_number = any(desired))
    and not exists (
      select 1 from public.cables c
      where c.endpoint_a_port_id = p.id or c.endpoint_b_port_id = p.id
    );

  -- Add any ports the new type requires.
  insert into public.ports (asset_id, port_number, port_type)
  select p_asset_id, pn, case when pn = 'WAN' then 'SFP' else 'RJ45' end
  from unnest(desired) as pn
  where not exists (
    select 1 from public.ports
    where asset_id = p_asset_id and port_number = pn
  );
end;
$$;

-- Trigger-only helper: keep it off the PostgREST/RPC surface.
revoke all on function public.reconcile_asset_ports(uuid, text) from public;
revoke all on function public.reconcile_asset_ports(uuid, text) from anon, authenticated;

create or replace function public.generate_default_ports()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.reconcile_asset_ports(new.id, new.type);
  return new;
end;
$$;

drop trigger if exists trg_assets_generate_ports on public.assets;
create trigger trg_assets_generate_ports
after insert or update of type on public.assets
for each row execute function public.generate_default_ports();

-- Reconcile assets whose type was changed before this migration.
-- This does not modify the assets rows themselves (no audit entries).
select public.reconcile_asset_ports(id, type) from public.assets;

-- ============================================================
-- 2. ADMIN-ONLY DECOMMISSIONING
-- ============================================================
create or replace function public.guard_decommission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'decommissioned' and public.user_role() <> 'admin' then
    if tg_op = 'INSERT' then
      raise exception 'Only an admin can decommission this record.';
    elsif old.status is distinct from 'decommissioned' then
      raise exception 'Only an admin can decommission this record.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assets_guard_decommission on public.assets;
create trigger trg_assets_guard_decommission
  before insert or update of status on public.assets
  for each row execute function public.guard_decommission();

drop trigger if exists trg_cables_guard_decommission on public.cables;
create trigger trg_cables_guard_decommission
  before insert or update of status on public.cables
  for each row execute function public.guard_decommission();

-- ============================================================
-- 3. LAST-ADMIN GUARD
-- ============================================================
create or replace function public.protect_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining int;
begin
  if tg_op = 'DELETE' then
    if old.role = 'admin' then
      select count(*) into remaining
      from public.profiles
      where role = 'admin' and id <> old.id;
      if remaining = 0 then
        raise exception 'Cannot remove the last admin account.';
      end if;
    end if;
    return old;
  end if;

  if old.role = 'admin' and new.role <> 'admin' then
    select count(*) into remaining
    from public.profiles
    where role = 'admin' and id <> old.id;
    if remaining = 0 then
      raise exception 'Cannot demote the last admin account.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_last_admin on public.profiles;
create trigger trg_protect_last_admin
before update of role or delete on public.profiles
for each row execute function public.protect_last_admin();

-- ============================================================
-- VERIFY (optional):
--   select tgname from pg_trigger where not tgisinternal order by 1;
--   select id, type, (select count(*) from public.ports p where p.asset_id = a.id)
--   from public.assets a;
-- ============================================================
