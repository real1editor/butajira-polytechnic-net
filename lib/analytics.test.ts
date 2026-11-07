import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  Asset,
  CableJoined,
  CableStatus,
  MaintenanceJoined,
  PortJoined,
} from "@/lib/queries";
import {
  buildInsights,
  computeNetworkHealth,
  computePortUtilization,
  connectedAssetIds,
  costTrend,
  outcomeCounts,
  statusCounts,
  totalMaintenanceCost,
  typeCounts,
  usedPortIds,
} from "@/lib/analytics";

function makeAsset(overrides: Partial<Asset> & Pick<Asset, "id" | "name">): Asset {
  return {
    asset_tag: null,
    type: "switch",
    location: null,
    ip_address: "10.0.0.1",
    status: "active",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makePort(id: string, asset: Asset, portNumber = "1"): PortJoined {
  return {
    id,
    asset_id: asset.id,
    port_number: portNumber,
    port_type: "RJ45",
    created_at: "2026-01-01T00:00:00.000Z",
    assets: { id: asset.id, name: asset.name, type: asset.type },
  };
}

function makeCable(
  id: string,
  a: PortJoined,
  b: PortJoined,
  status: CableStatus = "active"
): CableJoined {
  return {
    id,
    label: `cable-${id}`,
    cable_type: "Cat6",
    length_m: 5,
    endpoint_a_port_id: a.id,
    endpoint_b_port_id: b.id,
    status,
    created_at: "2026-01-01T00:00:00.000Z",
    endpoint_a: a,
    endpoint_b: b,
  };
}

function makeLog(
  id: string,
  asset: Asset,
  overrides: Partial<MaintenanceJoined> = {}
): MaintenanceJoined {
  return {
    id,
    asset_id: asset.id,
    log_date: "2026-01-15",
    maintenance_type: "corrective",
    title: "Repair",
    description: null,
    action_taken: null,
    performed_by: null,
    cost: 100,
    outcome: "completed",
    created_at: "2026-01-01T00:00:00.000Z",
    assets: { id: asset.id, name: asset.name, type: asset.type },
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("connectedAssetIds / usedPortIds", () => {
  const a = makeAsset({ id: "a", name: "A" });
  const b = makeAsset({ id: "b", name: "B" });
  const portA = makePort("pa", a);
  const portB = makePort("pb", b);
  const active = makeCable("c1", portA, portB, "active");
  const retired = makeCable("c2", portA, portB, "decommissioned");

  it("includes assets and ports for live cables only", () => {
    expect([...connectedAssetIds([active])].sort()).toEqual(["a", "b"]);
    expect([...usedPortIds([active])].sort()).toEqual(["pa", "pb"]);
  });

  it("ignores decommissioned cables", () => {
    expect(connectedAssetIds([retired]).size).toBe(0);
    expect(usedPortIds([retired]).size).toBe(0);
  });
});

describe("computeNetworkHealth", () => {
  it("returns an N/A score when there are no assets", () => {
    const health = computeNetworkHealth([], [], [], []);
    expect(health.score).toBe(0);
    expect(health.grade).toBe("N/A");
    expect(health.components).toHaveLength(4);
    expect(health.components.every((component) => component.score === 0)).toBe(true);
  });

  it("scores a fully healthy network at 100", () => {
    const a = makeAsset({ id: "a", name: "A" });
    const b = makeAsset({ id: "b", name: "B" });
    const portA = makePort("pa", a);
    const portB = makePort("pb", b);
    const cable = makeCable("c1", portA, portB);
    const log = makeLog("l1", a, { outcome: "completed" });

    const health = computeNetworkHealth([a, b], [portA, portB], [cable], [log]);
    expect(health.score).toBe(100);
    expect(health.grade).toBe("A+");
  });

  it("penalizes offline assets", () => {
    const a = makeAsset({ id: "a", name: "A" });
    const b = makeAsset({ id: "b", name: "B", status: "offline" });
    const portA = makePort("pa", a);
    const portB = makePort("pb", b);
    const cable = makeCable("c1", portA, portB);

    const health = computeNetworkHealth([a, b], [portA, portB], [cable], []);
    expect(health.score).toBe(83);
    expect(health.grade).toBe("A");
    const availability = health.components.find((component) => component.key === "availability");
    expect(availability?.score).toBe(50);
  });
});

describe("computePortUtilization", () => {
  it("computes and sorts utilization by percentage", () => {
    const a = makeAsset({ id: "a", name: "A" });
    const b = makeAsset({ id: "b", name: "B" });
    const portA1 = makePort("pa1", a);
    const portA2 = makePort("pa2", a, "2");
    const portB1 = makePort("pb1", b);
    const cable = makeCable("c1", portA1, portB1);

    const rows = computePortUtilization([a, b], [portA1, portA2, portB1], [cable]);
    expect(rows.map((row) => row.asset.id)).toEqual(["b", "a"]);
    expect(rows[0]).toMatchObject({ total: 1, used: 1, pct: 100 });
    expect(rows[1]).toMatchObject({ total: 2, used: 1, pct: 50 });
  });
});

describe("buildInsights", () => {
  it("reports all clear when nothing needs attention", () => {
    const a = makeAsset({ id: "a", name: "A" });
    const b = makeAsset({ id: "b", name: "B" });
    const portA = makePort("pa", a);
    const portB = makePort("pb", b);
    const cable = makeCable("c1", portA, portB);

    const insights = buildInsights([a, b], [], [cable], []);
    expect(insights).toHaveLength(1);
    expect(insights[0]?.id).toBe("all-clear");
  });

  it("reports offline and isolated devices", () => {
    const offline = makeAsset({ id: "off", name: "Edge", status: "offline" });
    const isolated = makeAsset({ id: "iso", name: "Lab" });
    const insights = buildInsights([offline, isolated], [], [], []);
    const ids = insights.map((insight) => insight.id);
    expect(ids).toContain("offline");
    expect(ids).toContain("isolated");
  });
});

describe("counts", () => {
  it("counts asset status, type and log outcomes", () => {
    const assets = [
      makeAsset({ id: "a", name: "A", status: "active" }),
      makeAsset({ id: "b", name: "B", status: "offline" }),
      makeAsset({ id: "c", name: "C", status: "decommissioned", type: "patch_panel" }),
    ];
    expect(statusCounts(assets)).toEqual({
      active: 1,
      maintenance: 0,
      offline: 1,
      decommissioned: 1,
    });
    expect(typeCounts(assets)).toEqual({ switch: 2, router: 0, patch_panel: 1 });

    const logs = [
      makeLog("l1", assets[0]),
      makeLog("l2", assets[0], { outcome: "failed" }),
      makeLog("l3", assets[0], { outcome: "pending" }),
    ];
    expect(outcomeCounts(logs)).toEqual({ pending: 1, completed: 1, failed: 1 });
  });
});

describe("costTrend", () => {
  it("buckets costs into the trailing months", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15));

    const a = makeAsset({ id: "a", name: "A" });
    const logs = [
      makeLog("l1", a, { log_date: "2026-01-10", cost: 100 }),
      makeLog("l2", a, { log_date: "2026-03-02", cost: 50 }),
      makeLog("l3", a, { log_date: "2026-03-03", cost: null }),
      makeLog("l4", a, { log_date: "2025-12-31", cost: 25 }),
    ];

    const points = costTrend(logs, 3);
    expect(points.map((point) => point.key)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(points.map((point) => point.value)).toEqual([100, 0, 50]);
  });

  it("sums every non-null cost", () => {
    const a = makeAsset({ id: "a", name: "A" });
    const logs = [
      makeLog("l1", a, { cost: 100 }),
      makeLog("l2", a, { cost: 50 }),
      makeLog("l3", a, { cost: null }),
    ];
    expect(totalMaintenanceCost(logs)).toBe(150);
  });
});
