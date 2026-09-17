import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { toUserMessage } from "@/lib/errors";
import type { UserRole } from "@/app/contexts/AuthContext";
import {
  CABLE_STATUSES,
  assetSchema,
  cableSchema,
  maintenanceLogSchema,
  portSchema,
  roleSchema,
  zodMessage,
} from "@/lib/validation";

export type UserProfile = {
  id: string;
  role: UserRole;
  display_name: string | null;
  created_at: string;
};

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

export type AuditLogAction = "INSERT" | "UPDATE" | "DELETE";
export type AuditTableName =
  | "assets"
  | "ports"
  | "cables"
  | "maintenance_logs"
  | "profiles";

export type AuditLog = {
  id: string;
  table_name: AuditTableName;
  record_id: string;
  action: AuditLogAction;
  changes: {
    old?: Record<string, unknown>;
    new?: Record<string, unknown>;
  };
  actor_id: string | null;
  created_at: string;
  actor_profiles?: { display_name: string | null } | null;
};

export type QueryResult<T> = { data: T[] | null; error: string | null };

/**
 * Wraps a Supabase select query so thrown exceptions (network, edge runtime
 * errors, etc.) are caught and turned into friendly messages instead of
 * propagating as unhandled rejections.
 */
async function fetchRows<T>(
  query: PromiseLike<{ data: unknown; error: { message?: string } | null }>
): Promise<QueryResult<T>> {
  try {
    const { data, error } = await query;
    return {
      data: (data as T[] | null) ?? null,
      error: error ? toUserMessage(error) : null,
    };
  } catch (err) {
    return { data: null, error: toUserMessage(err) };
  }
}

/**
 * Wraps a Supabase mutation so thrown exceptions and RLS rejections are
 * caught and turned into friendly user-facing messages.
 */
async function mutate(
  query: PromiseLike<{ error: { message?: string } | null }>
): Promise<string | null> {
  try {
    const { error } = await query;
    return error ? toUserMessage(error) : null;
  } catch (err) {
    return toUserMessage(err);
  }
}

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

export async function updateAsset(
  id: string,
  payload: Partial<
    Pick<Asset, "name" | "type" | "status" | "location" | "ip_address" | "asset_tag">
  >
): Promise<string | null> {
  const updates: Record<string, unknown> = {};
  if ("name" in payload) updates.name = payload.name?.trim();
  if ("asset_tag" in payload) updates.asset_tag = payload.asset_tag?.trim() || null;
  if ("type" in payload) updates.type = payload.type;
  if ("status" in payload) updates.status = payload.status;
  if ("location" in payload) updates.location = payload.location?.trim() || null;
  if ("ip_address" in payload) updates.ip_address = payload.ip_address?.trim() || null;

  const parsed = assetSchema.partial().safeParse(updates);
  if (!parsed.success) return zodMessage(parsed.error);

  return mutate(supabase.from("assets").update(parsed.data).eq("id", id));
}

export async function deleteAsset(id: string): Promise<string | null> {
  return mutate(supabase.from("assets").delete().eq("id", id));
}

export async function fetchAssets(): Promise<QueryResult<Asset>> {
  return fetchRows<Asset>(
    supabase.from("assets").select("*").order("created_at", { ascending: false })
  );
}

const defaultTag = () =>
  `BPC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
    Math.random() * 900 + 100
  )}`;

export async function insertAsset(
  payload: Pick<Asset, "name" | "type" | "status"> &
    Partial<Pick<Asset, "location" | "ip_address" | "asset_tag">>
): Promise<string | null> {
  const parsed = assetSchema.safeParse(payload);
  if (!parsed.success) return zodMessage(parsed.error);

  return mutate(
    supabase.from("assets").insert({
      name: parsed.data.name.trim(),
      type: parsed.data.type,
      asset_tag: parsed.data.asset_tag?.trim() || defaultTag(),
      location: parsed.data.location?.trim() || null,
      ip_address: parsed.data.ip_address ?? null,
      status: parsed.data.status,
    })
  );
}

export async function fetchPorts(): Promise<QueryResult<PortJoined>> {
  return fetchRows<PortJoined>(
    supabase.from("ports").select("*, assets(id, name, type)").order("created_at", { ascending: false })
  );
}

export async function insertPort(
  asset_id: string,
  port_number: string,
  port_type: PortType
): Promise<string | null> {
  const parsed = portSchema.safeParse({ asset_id, port_number, port_type });
  if (!parsed.success) return zodMessage(parsed.error);

  return mutate(
    supabase.from("ports").insert({
      asset_id: parsed.data.asset_id,
      port_number: parsed.data.port_number.trim(),
      port_type: parsed.data.port_type,
    })
  );
}

export async function fetchCables(): Promise<QueryResult<CableJoined>> {
  return fetchRows<CableJoined>(
    supabase
      .from("cables")
      .select(
        "*, endpoint_a:ports!cables_endpoint_a_port_id_fkey(id, port_number, port_type, asset_id, assets(id, name, type)), endpoint_b:ports!cables_endpoint_b_port_id_fkey(id, port_number, port_type, asset_id, assets(id, name, type))"
      )
      .order("created_at", { ascending: false })
  );
}

export async function insertCable(payload: {
  label: string;
  cable_type: CableType;
  length_m: number | null;
  endpoint_a_port_id: string;
  endpoint_b_port_id: string;
}): Promise<string | null> {
  const parsed = cableSchema.safeParse(payload);
  if (!parsed.success) return zodMessage(parsed.error);

  return mutate(
    supabase.from("cables").insert({ ...parsed.data, length_m: parsed.data.length_m ?? null })
  );
}

export async function updateCableStatus(
  id: string,
  status: CableStatus
): Promise<string | null> {
  const parsed = z.enum(CABLE_STATUSES).safeParse(status);
  if (!parsed.success) return zodMessage(parsed.error);

  return mutate(supabase.from("cables").update({ status }).eq("id", id));
}

export async function deleteMaintenanceLog(id: string): Promise<string | null> {
  return mutate(supabase.from("maintenance_logs").delete().eq("id", id));
}

export async function fetchMaintenanceLogs(): Promise<QueryResult<MaintenanceJoined>> {
  return fetchRows<MaintenanceJoined>(
    supabase
      .from("maintenance_logs")
      .select("*, assets(id, name, type)")
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false })
  );
}

export async function fetchRecentMaintenance(
  limit = 5
): Promise<QueryResult<MaintenanceJoined>> {
  return fetchRows<MaintenanceJoined>(
    supabase
      .from("maintenance_logs")
      .select("*, assets(id, name, type)")
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit)
  );
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
  const parsed = maintenanceLogSchema.safeParse(payload);
  if (!parsed.success) return zodMessage(parsed.error);

  return mutate(
    supabase.from("maintenance_logs").insert({
      asset_id: parsed.data.asset_id,
      log_date: parsed.data.log_date,
      maintenance_type: parsed.data.maintenance_type,
      title: parsed.data.title,
      description: parsed.data.description,
      action_taken: parsed.data.action_taken?.trim() || "No action recorded",
      performed_by: parsed.data.performed_by,
      cost: parsed.data.cost ?? null,
      outcome: parsed.data.outcome,
    })
  );
}

export async function fetchProfiles(): Promise<QueryResult<UserProfile>> {
  return fetchRows<UserProfile>(
    supabase
      .from("profiles")
      .select("id, role, display_name, created_at")
      .order("created_at", { ascending: false })
  );
}

export async function updateUserRole(
  id: string,
  role: UserRole
): Promise<string | null> {
  const parsed = roleSchema.safeParse({ role });
  if (!parsed.success) return zodMessage(parsed.error);

  return mutate(supabase.from("profiles").update({ role }).eq("id", id));
}

export async function fetchStats(): Promise<Stats> {
  try {
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
  } catch {
    return { assets: 0, activeAssets: 0, ports: 0, activeCables: 0, maintenanceLogs: 0 };
  }
}

export async function fetchAuditLogs(limit = 200): Promise<QueryResult<AuditLog>> {
  return fetchRows<AuditLog>(
    supabase
      .from("audit_logs")
      .select("*, actor_profiles:profiles!audit_logs_actor_id_fkey(display_name)")
      .order("created_at", { ascending: false })
      .limit(limit)
  );
}