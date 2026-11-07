import type {
  Asset,
  AssetStatus,
  AssetType,
  CableJoined,
  MaintenanceJoined,
  MaintenanceOutcome,
  PortJoined,
} from "@/lib/queries";

export type InsightSeverity = "critical" | "warning" | "info" | "success";

export type Insight = {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  href?: string;
  actionLabel?: string;
};

export type HealthComponent = {
  key: string;
  label: string;
  score: number;
  weight: number;
  detail: string;
};

export type NetworkHealth = {
  score: number;
  grade: string;
  summary: string;
  components: HealthComponent[];
};

export type PortUtilization = {
  asset: Asset;
  total: number;
  used: number;
  pct: number;
};

export type CostPoint = {
  key: string;
  label: string;
  value: number;
};

const clampPct = (value: number) => Math.max(0, Math.min(100, value));

/** Percentage helper that treats "nothing to measure" as perfect (100). */
const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 100);

/**
 * Asset ids that terminate at least one live cable (active or planned).
 * Decommissioned cables are ignored — they no longer carry traffic.
 */
export function connectedAssetIds(cables: CableJoined[]): Set<string> {
  const ids = new Set<string>();
  for (const cable of cables) {
    if (cable.status === "decommissioned") continue;
    ids.add(cable.endpoint_a.assets.id);
    ids.add(cable.endpoint_b.assets.id);
  }
  return ids;
}

/** Port ids currently consumed by a live (non-decommissioned) cable. */
export function usedPortIds(cables: CableJoined[]): Set<string> {
  const ids = new Set<string>();
  for (const cable of cables) {
    if (cable.status === "decommissioned") continue;
    ids.add(cable.endpoint_a_port_id);
    ids.add(cable.endpoint_b_port_id);
  }
  return ids;
}

/**
 * Weighted 0–100 health score for the whole managed network.
 *
 * Availability (35%) + connectivity coverage (25%) + cable health (20%) +
 * maintenance reliability (20%). Every component is explainable in the UI so
 * the score never feels like a black box.
 */
export function computeNetworkHealth(
  assets: Asset[],
  ports: PortJoined[],
  cables: CableJoined[],
  logs: MaintenanceJoined[]
): NetworkHealth {
  if (assets.length === 0) {
    return {
      score: 0,
      grade: "N/A",
      summary: "Add your first asset to start scoring the network.",
      components: [
        {
          key: "availability",
          label: "Device availability",
          score: 0,
          weight: 35,
          detail: "No assets registered yet",
        },
        {
          key: "connectivity",
          label: "Connectivity coverage",
          score: 0,
          weight: 25,
          detail: "No assets registered yet",
        },
        {
          key: "cables",
          label: "Cable health",
          score: 0,
          weight: 20,
          detail: "No cables registered yet",
        },
        {
          key: "maintenance",
          label: "Maintenance reliability",
          score: 0,
          weight: 20,
          detail: "No maintenance history yet",
        },
      ],
    };
  }

  const liveAssets = assets.filter((asset) => asset.status !== "decommissioned");
  const activeAssets = liveAssets.filter((asset) => asset.status === "active").length;
  const availability = clampPct(pct(activeAssets, liveAssets.length));

  const connected = connectedAssetIds(cables);
  const connectedCount = liveAssets.filter((asset) => connected.has(asset.id)).length;
  const connectivity = clampPct(pct(connectedCount, liveAssets.length));

  const liveCables = cables.filter((cable) => cable.status !== "decommissioned");
  const activeCables = liveCables.filter((cable) => cable.status === "active").length;
  const cableHealth = clampPct(pct(activeCables, liveCables.length));

  const completed = logs.filter((log) => log.outcome === "completed").length;
  const failed = logs.filter((log) => log.outcome === "failed").length;
  const pending = logs.filter((log) => log.outcome === "pending").length;
  const resolved = completed + failed;
  const maintenance = clampPct(
    resolved > 0 ? (completed / resolved) * 100 - Math.min(20, pending * 4) : 100
  );

  const components: HealthComponent[] = [
    {
      key: "availability",
      label: "Device availability",
      score: Math.round(availability),
      weight: 35,
      detail: `${activeAssets} of ${liveAssets.length} live assets are active`,
    },
    {
      key: "connectivity",
      label: "Connectivity coverage",
      score: Math.round(connectivity),
      weight: 25,
      detail: `${connectedCount} of ${liveAssets.length} assets have a mapped cable`,
    },
    {
      key: "cables",
      label: "Cable health",
      score: Math.round(cableHealth),
      weight: 20,
      detail: `${activeCables} of ${liveCables.length} live cables are active`,
    },
    {
      key: "maintenance",
      label: "Maintenance reliability",
      score: Math.round(maintenance),
      weight: 20,
      detail:
        resolved > 0
          ? `${completed} completed · ${failed} failed · ${pending} pending`
          : "No maintenance history yet",
    },
  ];

  const score = Math.round(
    components.reduce((sum, component) => sum + component.score * component.weight, 0) / 100
  );

  const { grade, summary } = describeScore(score);
  return { score, grade, summary, components };
}

function describeScore(score: number): { grade: string; summary: string } {
  if (score >= 90) return { grade: "A+", summary: "Excellent — the network is in great shape." };
  if (score >= 80) return { grade: "A", summary: "Healthy — only minor items to review." };
  if (score >= 70) return { grade: "B", summary: "Good — a few areas need attention." };
  if (score >= 60) return { grade: "C", summary: "Fair — several risks were detected." };
  if (score >= 40) return { grade: "D", summary: "At risk — prioritize remediation." };
  return { grade: "F", summary: "Critical — immediate attention is required." };
}

function joinNames(names: string[], max = 3): string {
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} +${names.length - max} more`;
}

/**
 * Rule-based recommendations surfaced to operators. Every insight is
 * actionable and links to the page where the fix lives.
 */
export function buildInsights(
  assets: Asset[],
  ports: PortJoined[],
  cables: CableJoined[],
  logs: MaintenanceJoined[]
): Insight[] {
  const insights: Insight[] = [];

  const offline = assets.filter((asset) => asset.status === "offline");
  if (offline.length > 0) {
    insights.push({
      id: "offline",
      severity: "critical",
      title: `${offline.length} device${offline.length === 1 ? " is" : "s are"} offline`,
      detail: joinNames(offline.map((asset) => asset.name)),
      href: "/",
      actionLabel: "Review assets",
    });
  }

  const underMaintenance = assets.filter((asset) => asset.status === "maintenance");
  if (underMaintenance.length > 0) {
    insights.push({
      id: "maintenance",
      severity: "warning",
      title: `${underMaintenance.length} device${underMaintenance.length === 1 ? "" : "s"} under maintenance`,
      detail: joinNames(underMaintenance.map((asset) => asset.name)),
      href: "/maintenance",
      actionLabel: "Open maintenance",
    });
  }

  const connected = connectedAssetIds(cables);
  const isolated = assets.filter(
    (asset) => asset.status !== "decommissioned" && !connected.has(asset.id)
  );
  if (isolated.length > 0) {
    insights.push({
      id: "isolated",
      severity: "warning",
      title: `${isolated.length} unconnected asset${isolated.length === 1 ? "" : "s"}`,
      detail: `${joinNames(isolated.map((asset) => asset.name))} — map a cable to bring them online.`,
      href: "/topology",
      actionLabel: "Open topology",
    });
  }

  const planned = cables.filter((cable) => cable.status === "planned");
  if (planned.length > 0) {
    insights.push({
      id: "planned",
      severity: "info",
      title: `${planned.length} planned cable${planned.length === 1 ? "" : "s"} pending`,
      detail: "Commission or retire planned links to keep the map accurate.",
      href: "/connections",
      actionLabel: "Manage connections",
    });
  }

  const failed = logs.filter((log) => log.outcome === "failed");
  if (failed.length > 0) {
    insights.push({
      id: "failed-logs",
      severity: "warning",
      title: `${failed.length} failed maintenance log${failed.length === 1 ? "" : "s"}`,
      detail: "Follow up on failed repairs to avoid repeat outages.",
      href: "/maintenance",
      actionLabel: "Review logs",
    });
  }

  const pending = logs.filter((log) => log.outcome === "pending");
  if (pending.length > 0) {
    insights.push({
      id: "pending-logs",
      severity: "info",
      title: `${pending.length} maintenance task${pending.length === 1 ? "" : "s"} pending`,
      detail: "Close out open work orders when the repair is verified.",
      href: "/maintenance",
      actionLabel: "View tasks",
    });
  }

  const utilization = computePortUtilization(assets, ports, cables);
  const saturated = utilization.filter((row) => row.total > 0 && row.pct >= 90);
  if (saturated.length > 0) {
    insights.push({
      id: "port-exhaustion",
      severity: "info",
      title: `${saturated.length} asset${saturated.length === 1 ? "" : "s"} near port exhaustion`,
      detail: joinNames(saturated.map((row) => `${row.asset.name} (${row.pct}%)`)),
      href: "/connections",
      actionLabel: "Plan capacity",
    });
  }

  const missingIp = assets.filter(
    (asset) => asset.type !== "patch_panel" && !asset.ip_address
  );
  if (missingIp.length > 0) {
    insights.push({
      id: "missing-ip",
      severity: "info",
      title: `${missingIp.length} device${missingIp.length === 1 ? "" : "s"} without an IP`,
      detail: joinNames(missingIp.map((asset) => asset.name)),
      href: "/",
      actionLabel: "Update inventory",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "all-clear",
      severity: "success",
      title: "All clear",
      detail: "No urgent issues detected across devices, cabling, or maintenance.",
    });
  }

  return insights.slice(0, 7);
}

export function computePortUtilization(
  assets: Asset[],
  ports: PortJoined[],
  cables: CableJoined[]
): PortUtilization[] {
  const used = usedPortIds(cables);
  const counts = new Map<string, { total: number; used: number }>();

  for (const asset of assets) {
    counts.set(asset.id, { total: 0, used: 0 });
  }
  for (const port of ports) {
    const entry = counts.get(port.asset_id);
    if (!entry) continue;
    entry.total += 1;
    if (used.has(port.id)) entry.used += 1;
  }

  return assets
    .map((asset) => {
      const entry = counts.get(asset.id) ?? { total: 0, used: 0 };
      return {
        asset,
        total: entry.total,
        used: entry.used,
        pct: entry.total > 0 ? Math.round((entry.used / entry.total) * 100) : 0,
      };
    })
    .sort((a, b) => b.pct - a.pct || b.used - a.used || a.asset.name.localeCompare(b.asset.name));
}

export function statusCounts(assets: Asset[]): Record<AssetStatus, number> {
  const counts: Record<AssetStatus, number> = {
    active: 0,
    maintenance: 0,
    offline: 0,
    decommissioned: 0,
  };
  for (const asset of assets) counts[asset.status] += 1;
  return counts;
}

export function typeCounts(assets: Asset[]): Record<AssetType, number> {
  const counts: Record<AssetType, number> = {
    switch: 0,
    router: 0,
    patch_panel: 0,
  };
  for (const asset of assets) counts[asset.type] += 1;
  return counts;
}

export function outcomeCounts(logs: MaintenanceJoined[]): Record<MaintenanceOutcome, number> {
  const counts: Record<MaintenanceOutcome, number> = {
    pending: 0,
    completed: 0,
    failed: 0,
  };
  for (const log of logs) counts[log.outcome] += 1;
  return counts;
}

/** Sum of maintenance cost for the trailing `months` calendar months. */
export function costTrend(logs: MaintenanceJoined[], months = 6): CostPoint[] {
  const now = new Date();
  const buckets: CostPoint[] = [];

  for (let index = months - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    buckets.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("en-GB", { month: "short" }),
      value: 0,
    });
  }

  for (const log of logs) {
    if (log.cost == null) continue;
    const [year, month] = log.log_date.split("-").map(Number);
    if (!year || !month) continue;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const bucket = buckets.find((item) => item.key === key);
    if (bucket) bucket.value += Number(log.cost) || 0;
  }

  return buckets;
}

export function totalMaintenanceCost(logs: MaintenanceJoined[]): number {
  return logs.reduce((sum, log) => sum + (Number(log.cost) || 0), 0);
}
