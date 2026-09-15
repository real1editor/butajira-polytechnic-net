import { supabase } from "@/lib/supabase";

export type AssetType = "switch" | "router" | "patch_panel";
export type AssetStatus = "active" | "maintenance" | "offline" | "decommissioned";
export type PortType = "RJ45" | "SFP" | "SFP+" | "Fiber";
export type CableType = "Cat5e" | "Cat6" | "Cat6a" | "Cat7" | "Fiber SM" | "Fiber MM";
export type CableStatus = "active" | "planned" | "decommissioned";
export type MaintenanceType = "preventive" | "corrective" | "inspection";
export type MaintenanceOutcome = "pending" | "completed" | "failed";

export type Asset = {
  id: string;
  name: string;
  asset_tag: string | null;
  type: AssetType;
  location: string | null;
  ip_address: string | null;
  status: AssetStatus;
  created_at: string;
};

export type Port = {
  id: string;
  asset_id: string;
  port_number: string;
  port_type: PortType;
  created_at: string;
};

export type PortJoined = Port & {
  assets: Pick<Asset, "id" | "name" | "type">;
};

export type Cable = {
  id: string;
  label: string;
  cable_type: CableType;
  length_m: number | null;
  endpoint_a_port_id: string;
  endpoint_b_port_id: string;
  status: CableStatus;
  created_at: string;
};

export type CableJoined = Cable & {
  endpoint_a: PortJoined;
  endpoint_b: PortJoined;
};

export type MaintenanceLog = {
  id: string;
  asset_id: string;
  log_date: string;
  maintenance_type: MaintenanceType;
  title: string;
  description: string | null;
  action_taken: string | null;
  performed_by: string | null;
  cost: number | null;
  outcome: MaintenanceOutcome;
  created_at: string;
};

export type MaintenanceJoined = MaintenanceLog & {
  assets: Pick<Asset, "id" | "name" | "type">;
};

export type Stats = {
  assets: number;
  activeAssets: number;
  ports: number;
  activeCables: number;
  maintenanceLogs: number;
};

export type QueryResult<T> = { data: T[] | null; error: string | null };

const message = (error: { message?: string } | null) => error?.message ?? null;

export const TYPE_LABELS: Record<AssetType, string> = {
  switch: "Switch",
  router: "Router",
  patch_panel: "Patch Panel",
};

export const STATUS_STYLES: Record<AssetStatus, string> = {
  active: "bg-green-100 text-green-800",
  maintenance: "bg-amber-100 text-amber-800",
  offline: "bg-red-100 text-red-800",
  decommissioned: "bg-zinc-200 text-zinc-600",
};

export const CABLE_TYPE_LABELS: Record<CableType, string> = {
  Cat5e: "Cat5e",
  Cat6: "Cat6",
  Cat6a: "Cat6a",
  Cat7: "Cat7",
  "Fiber SM": "Fiber SM",
  "Fiber MM": "Fiber MM",
};

export const CABLE_STATUS_STYLES: Record<CableStatus, string> = {
  active: "bg-green-100 text-green-800",
  planned: "bg-blue-100 text-blue-800",
  decommissioned: "bg-zinc-200 text-zinc-600",
};

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  preventive: "Preventive",
  corrective: "Corrective",
  inspection: "Inspection",
};

export const OUTCOME_STYLES: Record<MaintenanceOutcome, string> = {
  pending: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export async function fetchAssets(): Promise<QueryResult<Asset>> {
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false });
  return { data: (data as Asset[] | null) ?? null, error: message(error) };
}

const defaultTag = () =>
  `BPC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
    Math.random() * 900 + 100
  )}`;

export async function insertAsset(
  payload: Pick<Asset, "name" | "type" | "status"> &
    Partial<Pick<Asset, "location" | "ip_address" | "asset_tag">>
): Promise<string | null> {
  const { error } = await supabase.from("assets").insert({
    name: payload.name.trim(),
    type: payload.type,
    asset_tag: payload.asset_tag?.trim() || defaultTag(),
    location: payload.location?.trim() || null,
    ip_address: payload.ip_address?.trim() || null,
    status: payload.status,
  });
  return message(error);
}

export async function fetchPorts(): Promise<QueryResult<PortJoined>> {
  const { data, error } = await supabase
    .from("ports")
    .select("*, assets(id, name, type)")
    .order("created_at", { ascending: false });
  return { data: (data as PortJoined[] | null) ?? null, error: message(error) };
}

export async function insertPort(
  asset_id: string,
  port_number: string,
  port_type: PortType
): Promise<string | null> {
  const { error } = await supabase
    .from("ports")
    .insert({ asset_id, port_number: port_number.trim(), port_type });
  return message(error);
}

export async function fetchCables(): Promise<QueryResult<CableJoined>> {
  const { data, error } = await supabase
    .from("cables")
    .select(
      "*, endpoint_a:ports!cables_endpoint_a_port_id_fkey(id, port_number, port_type, asset_id, assets(id, name, type)), endpoint_b:ports!cables_endpoint_b_port_id_fkey(id, port_number, port_type, asset_id, assets(id, name, type))"
    )
    .order("created_at", { ascending: false });
  return { data: (data as CableJoined[] | null) ?? null, error: message(error) };
}

export async function insertCable(payload: {
  label: string;
  cable_type: CableType;
  length_m: number | null;
  endpoint_a_port_id: string;
  endpoint_b_port_id: string;
}): Promise<string | null> {
  const { error } = await supabase.from("cables").insert(payload);
  return message(error);
}

export async function updateCableStatus(
  id: string,
  status: CableStatus
): Promise<string | null> {
  const { error } = await supabase.from("cables").update({ status }).eq("id", id);
  return message(error);
}

export async function fetchMaintenanceLogs(): Promise<QueryResult<MaintenanceJoined>> {
  const { data, error } = await supabase
    .from("maintenance_logs")
    .select("*, assets(id, name, type)")
    .order("log_date", { ascending: false })
    .order("created_at", { ascending: false });
  return { data: (data as MaintenanceJoined[] | null) ?? null, error: message(error) };
}

export async function insertMaintenanceLog(payload: {
  asset_id: string;
  log_date: string;
  maintenance_type: MaintenanceType;
  title: string;
  description: string | null;
  action_taken?: string | null;
  performed_by: string | null;
  cost: number | null;
  outcome: MaintenanceOutcome;
}): Promise<string | null> {
  const { error } = await supabase.from("maintenance_logs").insert({
    asset_id: payload.asset_id,
    log_date: payload.log_date,
    maintenance_type: payload.maintenance_type,
    title: payload.title,
    description: payload.description,
    action_taken: payload.action_taken?.trim() || "No action recorded",
    performed_by: payload.performed_by,
    cost: payload.cost,
    outcome: payload.outcome,
  });
  return message(error);
}

export async function fetchStats(): Promise<Stats> {
  const [assets, activeAssets, ports, activeCables, maintenanceLogs] =
    await Promise.all([
      supabase.from("assets").select("id", { count: "exact", head: true }),
      supabase
        .from("assets")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase.from("ports").select("id", { count: "exact", head: true }),
      supabase
        .from("cables")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("maintenance_logs")
        .select("id", { count: "exact", head: true }),
    ]);

  return {
    assets: assets.count ?? 0,
    activeAssets: activeAssets.count ?? 0,
    ports: ports.count ?? 0,
    activeCables: activeCables.count ?? 0,
    maintenanceLogs: maintenanceLogs.count ?? 0,
  };
}