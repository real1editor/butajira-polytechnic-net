create extension if not exists "pgcrypto";

grant usage on schema public to anon, authenticated;

-- ============================================================
-- ASSETS (network devices & patch panels)
-- ============================================================
create table if not exists public.assets (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  asset_tag  text not null default '',
  type       text not null check (type in ('switch', 'router', 'patch_panel')),
  location   text,
  ip_address text,
  status     text not null default 'active'
             check (status in ('active', 'maintenance', 'offline', 'decommissioned')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- PORTS (physical ports on each asset)
-- ============================================================
create table if not exists public.ports (
  id          uuid primary key default gen_random_uuid(),
  asset_id    uuid not null references public.assets(id) on delete cascade,
  port_number text not null,
  port_type   text not null default 'RJ45'
              check (port_type in ('RJ45', 'SFP', 'SFP+', 'Fiber')),
  created_at  timestamptz not null default now(),
  unique (asset_id, port_number)
);

-- ============================================================
-- CABLES (links between two device ports)
-- ============================================================
create table if not exists public.cables (
  id                   uuid primary key default gen_random_uuid(),
  label                text not null,
  cable_type           text not null default 'Cat6'
                       check (cable_type in ('Cat5e', 'Cat6', 'Cat6a', 'Cat7', 'Fiber SM', 'Fiber MM')),
  length_m             numeric(8, 2),
  endpoint_a_port_id   uuid not null references public.ports(id) on delete cascade,
  endpoint_b_port_id   uuid not null references public.ports(id) on delete cascade,
  status               text not null default 'active'
                       check (status in ('active', 'planned', 'decommissioned')),
  created_at           timestamptz not null default now(),
  check (endpoint_a_port_id <> endpoint_b_port_id)
);

-- ============================================================
-- MAINTENANCE LOGS (per asset)
-- ============================================================
create table if not exists public.maintenance_logs (
  id               uuid primary key default gen_random_uuid(),
  asset_id         uuid not null references public.assets(id) on delete cascade,
  log_date         date not null default current_date,
  maintenance_type text not null default 'corrective'
                   check (maintenance_type in ('preventive', 'corrective', 'inspection')),
  title            text not null,
  description      text,
  action_taken     text not null default '',
  performed_by     text,
  cost             numeric(10, 2),
  outcome          text not null default 'completed'
                   check (outcome in ('pending', 'completed', 'failed')),
  created_at       timestamptz not null default now()
);

-- ============================================================
-- SCHEMA RECONCILIATION (non-destructive)
-- Adds any columns missing from tables that were created earlier
-- with a different/older layout. Safe to run on populated tables.
-- ============================================================
alter table public.assets
  add column if not exists name text not null default '',
  add column if not exists asset_tag text not null default '',
  add column if not exists type text not null default 'switch',
  add column if not exists location text,
  add column if not exists ip_address text,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now();

alter table public.ports
  add column if not exists asset_id uuid,
  add column if not exists port_number text not null default '',
  add column if not exists port_type text not null default 'RJ45',
  add column if not exists created_at timestamptz not null default now();

-- Ensure a unique constraint on (asset_id, port_number) exists, so the
-- port-generation functions below can guard against duplicates. If existing
-- data already contains duplicates the constraint cannot be added; the
-- functions still work because they check for existing rows first.
do $$
declare
  col_a int;
  col_b int;
  has_unique boolean;
begin
  select attnum into col_a from pg_attribute
    where attrelid = 'public.ports'::regclass and attname = 'asset_id';
  select attnum into col_b from pg_attribute
    where attrelid = 'public.ports'::regclass and attname = 'port_number';

  select exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.ports'::regclass
      and c.contype = 'u'
      and array_length(c.conkey, 1) = 2
      and c.conkey @> array[col_a, col_b]
  ) into has_unique;

  if not coalesce(has_unique, false) then
    alter table public.ports
      add constraint ports_asset_id_port_number_key
      unique (asset_id, port_number);
  end if;
exception
  when others then
    null;
end $$;

alter table public.cables
  add column if not exists label text not null default '',
  add column if not exists cable_type text not null default 'Cat6',
  add column if not exists length_m numeric(8, 2),
  add column if not exists endpoint_a_port_id uuid,
  add column if not exists endpoint_b_port_id uuid,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now();

alter table public.maintenance_logs
  add column if not exists asset_id uuid,
  add column if not exists log_date date not null default current_date,
  add column if not exists maintenance_type text not null default 'corrective',
  add column if not exists title text not null default '',
  add column if not exists description text,
  add column if not exists action_taken text not null default '',
  add column if not exists performed_by text,
  add column if not exists cost numeric(10, 2),
  add column if not exists outcome text not null default 'completed',
  add column if not exists created_at timestamptz not null default now();

-- ============================================================
-- AUTO GENERATE PORTS TRIGGER
-- ============================================================
create or replace function public.generate_default_ports()
returns trigger
language plpgsql
as $$
declare
  pn text;
  total int;
begin
  if new.type = 'patch_panel' then
    total := 48;
  elsif new.type = 'switch' then
    total := 24;
  else
    total := 0;
  end if;

  for pn in select generate_series(1, total)::text loop
    insert into public.ports (asset_id, port_number)
    select new.id, pn
    where not exists (
      select 1 from public.ports
      where asset_id = new.id and port_number = pn
    );
  end loop;

  if new.type = 'router' then
    insert into public.ports (asset_id, port_number, port_type)
    select new.id, 'WAN', 'SFP'
    where not exists (
      select 1 from public.ports
      where asset_id = new.id and port_number = 'WAN'
    );
    insert into public.ports (asset_id, port_number)
    select new.id, 'LAN'
    where not exists (
      select 1 from public.ports
      where asset_id = new.id and port_number = 'LAN'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assets_generate_ports on public.assets;
create trigger trg_assets_generate_ports
after insert on public.assets
for each row execute function public.generate_default_ports();

-- ============================================================
-- BACKFILL HELPER
-- Generates default ports for assets that already existed before
-- the trigger was created. Run once after applying this schema:
--   select public.ensure_asset_ports(id) from public.assets;
-- ============================================================
create or replace function public.ensure_asset_ports(p_asset_id uuid)
returns void
language plpgsql
as $$
declare
  a_type text;
  pn text;
  total int;
begin
  select type into a_type from public.assets where id = p_asset_id;

  if a_type = 'patch_panel' then
    total := 48;
  elsif a_type = 'switch' then
    total := 24;
  else
    total := 0;
  end if;

  for pn in select generate_series(1, total)::text loop
    insert into public.ports (asset_id, port_number)
    select p_asset_id, pn
    where not exists (
      select 1 from public.ports
      where asset_id = p_asset_id and port_number = pn
    );
  end loop;

  if a_type = 'router' then
    insert into public.ports (asset_id, port_number, port_type)
    select p_asset_id, 'WAN', 'SFP'
    where not exists (
      select 1 from public.ports
      where asset_id = p_asset_id and port_number = 'WAN'
    );
    insert into public.ports (asset_id, port_number)
    select p_asset_id, 'LAN'
    where not exists (
      select 1 from public.ports
      where asset_id = p_asset_id and port_number = 'LAN'
    );
  end if;
end;
$$;

-- ============================================================
-- VIEW: asset summary
-- ============================================================
create or replace view public.v_asset_summary as
select
  a.id,
  a.name,
  a.type,
  a.status,
  a.location,
  a.ip_address,
  count(distinct p.id) as port_count,
  count(distinct c.id) as cable_count
from public.assets a
left join public.ports p on p.asset_id = a.id
left join public.cables c
  on c.endpoint_a_port_id = p.id or c.endpoint_b_port_id = p.id
group by a.id, a.name, a.type, a.status, a.location, a.ip_address;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.assets enable row level security;
alter table public.ports enable row level security;
alter table public.cables enable row level security;
alter table public.maintenance_logs enable row level security;

-- Drop old policies if they exist, then recreate
drop policy if exists "assets_anon_select" on public.assets;
drop policy if exists "assets_anon_insert" on public.assets;
drop policy if exists "assets_anon_update" on public.assets;
drop policy if exists "assets_anon_delete" on public.assets;

create policy "assets_anon_select" on public.assets for select using (true);
create policy "assets_anon_insert" on public.assets for insert with check (true);
create policy "assets_anon_update" on public.assets for update using (true) with check (true);
create policy "assets_anon_delete" on public.assets for delete using (true);

drop policy if exists "ports_anon_select" on public.ports;
drop policy if exists "ports_anon_insert" on public.ports;
drop policy if exists "ports_anon_update" on public.ports;
drop policy if exists "ports_anon_delete" on public.ports;

create policy "ports_anon_select" on public.ports for select using (true);
create policy "ports_anon_insert" on public.ports for insert with check (true);
create policy "ports_anon_update" on public.ports for update using (true) with check (true);
create policy "ports_anon_delete" on public.ports for delete using (true);

drop policy if exists "cables_anon_select" on public.cables;
drop policy if exists "cables_anon_insert" on public.cables;
drop policy if exists "cables_anon_insert" on public.cables;
drop policy if exists "cables_anon_update" on public.cables;
drop policy if exists "cables_anon_delete" on public.cables;

create policy "cables_anon_select" on public.cables for select using (true);
create policy "cables_anon_insert" on public.cables for insert with check (true);
create policy "cables_anon_update" on public.cables for update using (true) with check (true);
create policy "cables_anon_delete" on public.cables for delete using (true);

drop policy if exists "maintenance_anon_select" on public.maintenance_logs;
drop policy if exists "maintenance_anon_insert" on public.maintenance_logs;
drop policy if exists "maintenance_anon_update" on public.maintenance_logs;
drop policy if exists "maintenance_anon_delete" on public.maintenance_logs;

create policy "maintenance_anon_select" on public.maintenance_logs for select using (true);
create policy "maintenance_anon_insert" on public.maintenance_logs for insert with check (true);
create policy "maintenance_anon_update" on public.maintenance_logs for update using (true) with check (true);
create policy "maintenance_anon_delete" on public.maintenance_logs for delete using (true);

grant select, insert, update, delete on
  public.assets,
  public.ports,
  public.cables,
  public.maintenance_logs
to anon, authenticated;