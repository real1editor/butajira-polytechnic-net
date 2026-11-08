"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Asset,
  AssetStatus,
  CableJoined,
  PortJoined,
  TYPE_LABELS,
  fetchAssets,
  fetchCables,
  fetchPorts,
} from "@/lib/queries";
import ErrorBanner from "@/app/components/ErrorBanner";
import { inputClass } from "@/lib/ui";

const CANVAS_W = 900;
const CANVAS_H = 600;
const PADDING = 70;

const NODE_RADIUS: Record<Asset["type"], number> = {
  router: 27,
  switch: 23,
  patch_panel: 19,
};

const TYPE_LETTER: Record<Asset["type"], string> = {
  router: "R",
  switch: "S",
  patch_panel: "P",
};

const STATUS_THEME: Record<AssetStatus, { fill: string; stroke: string; label: string }> = {
  active: { fill: "#10b981", stroke: "#047857", label: "Active" },
  maintenance: { fill: "#f59e0b", stroke: "#b45309", label: "Maintenance" },
  offline: { fill: "#ef4444", stroke: "#b91c1c", label: "Offline" },
  decommissioned: { fill: "#a1a1aa", stroke: "#71717a", label: "Decommissioned" },
};

const LINK_COLOR = {
  active: "#10b981",
  planned: "#3b82f6",
  decommissioned: "#a1a1aa",
} as const;

type Point = { x: number; y: number };
type Layout = Record<string, Point>;
type LinkStatus = keyof typeof LINK_COLOR;

type GraphLink = {
  id: string;
  a: string;
  b: string;
  cables: CableJoined[];
  status: LinkStatus;
  count: number;
};

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

const normalize = (value: string | null | undefined) => (value ?? "").toLowerCase();

/**
 * Small deterministic force-directed layout (Fruchterman–Reingold style).
 * Nodes start on a circle, then repel each other while cables act as springs
 * and a weak centre gravity keeps the graph on canvas. Deterministic output
 * keeps the map stable between renders.
 */
function computeLayout(nodeIds: string[], edges: { a: string; b: string }[]): Layout {
  const count = nodeIds.length;
  if (count === 0) return {};

  const positions: Record<string, Point & { vx: number; vy: number }> = {};
  const radius = Math.min(CANVAS_W, CANVAS_H) * 0.33;

  nodeIds.forEach((id, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    positions[id] = {
      x: CANVAS_W / 2 + Math.cos(angle) * radius,
      y: CANVAS_H / 2 + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    };
  });

  const ideal = Math.max(95, Math.min(175, 520 / Math.sqrt(count)));
  const iterations = count > 80 ? 180 : 340;

  for (let iter = 0; iter < iterations; iter++) {
    const cooling = 1 - iter / iterations;

    for (let i = 0; i < count; i++) {
      const a = positions[nodeIds[i]];
      for (let j = i + 1; j < count; j++) {
        const b = positions[nodeIds[j]];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < 0.01) {
          dx = 0.1;
          dy = 0.1;
          distSq = 0.02;
        }
        const dist = Math.sqrt(distSq);
        const force = (ideal * ideal) / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    for (const edge of edges) {
      const a = positions[edge.a];
      const b = positions[edge.b];
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.01;
      const force = (dist - ideal * 1.15) * 0.02;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    for (const id of nodeIds) {
      const p = positions[id];
      p.vx += (CANVAS_W / 2 - p.x) * 0.0025;
      p.vy += (CANVAS_H / 2 - p.y) * 0.0025;
    }

    for (const id of nodeIds) {
      const p = positions[id];
      p.vx *= 0.84;
      p.vy *= 0.84;
      p.x += p.vx * cooling;
      p.y += p.vy * cooling;
      p.x = Math.max(PADDING, Math.min(CANVAS_W - PADDING, p.x));
      p.y = Math.max(PADDING, Math.min(CANVAS_H - PADDING, p.y));
    }
  }

  const layout: Layout = {};
  for (const id of nodeIds) {
    layout[id] = { x: positions[id].x, y: positions[id].y };
  }
  return layout;
}

export default function TopologyPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [ports, setPorts] = useState<PortJoined[]>([]);
  const [cables, setCables] = useState<CableJoined[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const didFit = useRef(false);

  useEffect(() => {
    let current = true;
    Promise.all([fetchAssets(), fetchPorts(), fetchCables()]).then(
      ([assetRes, portRes, cableRes]) => {
        if (!current) return;
        if (assetRes.error) setError(assetRes.error);
        else setAssets(assetRes.data ?? []);
        if (portRes.error) setError(portRes.error);
        else setPorts(portRes.data ?? []);
        if (cableRes.error) setError(cableRes.error);
        else setCables(cableRes.data ?? []);
        setLoading(false);
      }
    );
    return () => {
      current = false;
    };
  }, []);

  const portsByAsset = useMemo(() => {
    const map = new Map<string, PortJoined[]>();
    for (const port of ports) {
      const list = map.get(port.asset_id) ?? [];
      list.push(port);
      map.set(port.asset_id, list);
    }
    return map;
  }, [ports]);

  const links = useMemo<GraphLink[]>(() => {
    const grouped = new Map<string, GraphLink>();
    for (const cable of cables) {
      const a = cable.endpoint_a.assets.id;
      const b = cable.endpoint_b.assets.id;
      if (a === b) continue;
      const key = [a, b].sort().join("::");
      const existing = grouped.get(key);
      if (existing) {
        existing.cables.push(cable);
      } else {
        grouped.set(key, {
          id: key,
          a,
          b,
          cables: [cable],
          status: cable.status,
          count: 1,
        });
      }
    }
    for (const link of grouped.values()) {
      link.count = link.cables.length;
      if (link.cables.some((c) => c.status === "active")) link.status = "active";
      else if (link.cables.some((c) => c.status === "planned")) link.status = "planned";
      else link.status = "decommissioned";
    }
    return [...grouped.values()];
  }, [cables]);

  const nodeIds = useMemo(
    () => [...assets].map((a) => a.id).sort(),
    [assets]
  );

  const layout = useMemo(
    () =>
      computeLayout(
        nodeIds,
        links.map((link) => ({ a: link.a, b: link.b }))
      ),
    [links, nodeIds]
  );

  const fitView = useCallback(() => {
    if (nodeIds.length === 0) {
      setView({ x: 0, y: 0, k: 1 });
      return;
    }
    const xs = nodeIds.map((id) => layout[id].x);
    const ys = nodeIds.map((id) => layout[id].y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = Math.max(maxX - minX, 160) + 120;
    const height = Math.max(maxY - minY, 160) + 120;
    const k = Math.min(
      1.55,
      Math.max(0.4, Math.min(CANVAS_W / width, CANVAS_H / height))
    );
    setView({
      k,
      x: CANVAS_W / 2 - ((minX + maxX) / 2) * k,
      y: CANVAS_H / 2 - ((minY + maxY) / 2) * k,
    });
  }, [layout, nodeIds]);

  useEffect(() => {
    if (!loading && assets.length > 0 && !didFit.current) {
      didFit.current = true;
      fitView();
    }
  }, [assets.length, fitView, loading]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const local = point.matrixTransform(ctm.inverse());
      setView((prev) => {
        const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
        const k = Math.min(2.6, Math.max(0.35, prev.k * factor));
        const ratio = k / prev.k;
        return {
          k,
          x: local.x - (local.x - prev.x) * ratio,
          y: local.y - (local.y - prev.y) * ratio,
        };
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const term = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!term) return null;
    const set = new Set<string>();
    for (const asset of assets) {
      if (
        [asset.name, asset.asset_tag, asset.location, asset.ip_address]
          .map(normalize)
          .some((field) => field.includes(term))
      ) {
        set.add(asset.id);
      }
    }
    return set;
  }, [assets, term]);

  const focusId = hoveredId ?? selectedId;

  const neighbors = useMemo(() => {
    if (!focusId) return null;
    const set = new Set<string>([focusId]);
    for (const link of links) {
      if (link.a === focusId) set.add(link.b);
      if (link.b === focusId) set.add(link.a);
    }
    return set;
  }, [focusId, links]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedId) ?? null,
    [assets, selectedId]
  );

  const selectedCables = useMemo(() => {
    if (!selectedId) return [];
    return cables.filter(
      (cable) =>
        cable.endpoint_a.assets.id === selectedId ||
        cable.endpoint_b.assets.id === selectedId
    );
  }, [cables, selectedId]);

  const isolated = useMemo(() => {
    const connected = new Set<string>();
    for (const link of links) {
      if (link.status !== "decommissioned") {
        connected.add(link.a);
        connected.add(link.b);
      }
    }
    return assets.filter((asset) => !connected.has(asset.id));
  }, [assets, links]);

  const activeLinks = links.filter((link) => link.status === "active").length;
  const plannedLinks = links.filter((link) => link.status === "planned").length;

  function nodeOpacity(asset: Asset) {
    if (matches && !matches.has(asset.id)) return 0.16;
    if (neighbors && !neighbors.has(asset.id)) return 0.22;
    return 1;
  }

  function linkOpacity(link: GraphLink) {
    if (term && matches) {
      if (!matches.has(link.a) && !matches.has(link.b)) return 0.08;
    }
    if (neighbors) {
      return neighbors.has(link.a) && neighbors.has(link.b) ? 1 : 0.12;
    }
    return 0.85;
  }

  function zoomBy(factor: number) {
    setView((prev) => {
      const k = Math.min(2.6, Math.max(0.35, prev.k * factor));
      const ratio = k / prev.k;
      return {
        k,
        x: CANVAS_W / 2 - (CANVAS_W / 2 - prev.x) * ratio,
        y: CANVAS_H / 2 - (CANVAS_H / 2 - prev.y) * ratio,
      };
    });
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = rect.width ? CANVAS_W / rect.width : 1;
    setView((prev) => ({
      ...prev,
      x: drag.originX + dx * scale,
      y: drag.originY + dy * scale,
    }));
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  return (
    <div className="flex flex-1 flex-col font-sans text-slate-900 dark:text-slate-100">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Network Topology
            </h1>
            <p className="mt-1 text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
              Auto-generated physical map from assets and patch cables. Pan, zoom and
              inspect any node.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="glass-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {activeLinks} active links
            </span>
            <span className="glass-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
              {plannedLinks} planned
            </span>
            <span className="glass-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {isolated.length} isolated
            </span>
          </div>
        </header>

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <section className="glass-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-200/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find asset by name, tag, IP or location…"
                className={`${inputClass} w-full sm:max-w-xs`}
                aria-label="Filter topology"
              />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => zoomBy(1.2)}
                  aria-label="Zoom in"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300/70 bg-white/50 text-slate-600 backdrop-blur transition-colors hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => zoomBy(1 / 1.2)}
                  aria-label="Zoom out"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300/70 bg-white/50 text-slate-600 backdrop-blur transition-colors hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={fitView}
                  className="glass-chip inline-flex h-8 items-center justify-center px-2.5 text-xs font-medium transition-colors hover:text-cyan-700 dark:hover:text-cyan-300"
                >
                  Fit
                </button>
              </div>
            </div>

            <div className="relative">
              {loading ? (
                <div className="flex h-[420px] items-center justify-center text-sm text-zinc-500 sm:h-[520px]">
                  Building topology…
                </div>
              ) : assets.length === 0 ? (
                <div className="flex h-[420px] flex-col items-center justify-center gap-1 px-6 text-center text-sm text-zinc-500 sm:h-[520px]">
                  <p className="font-medium text-zinc-700 dark:text-zinc-300">
                    No assets to map yet
                  </p>
                  <p>Add switches, routers or patch panels on the dashboard first.</p>
                </div>
              ) : (
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                  className="h-[420px] w-full cursor-grab touch-none select-none active:cursor-grabbing sm:h-[520px]"
                  role="img"
                  aria-label="Interactive network topology"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  <defs>
                    <pattern
                      id="topology-grid"
                      width={36}
                      height={36}
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 36 0 L 0 0 0 36"
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity={0.09}
                        strokeWidth={1}
                      />
                    </pattern>
                  </defs>

                  <rect
                    width={CANVAS_W}
                    height={CANVAS_H}
                    fill="url(#topology-grid)"
                    className="text-zinc-500 dark:text-zinc-400"
                  />

                  <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
                    {links.map((link) => {
                      const a = layout[link.a];
                      const b = layout[link.b];
                      if (!a || !b) return null;
                      const radiusA = NODE_RADIUS[assets.find((x) => x.id === link.a)?.type ?? "switch"];
                      const radiusB = NODE_RADIUS[assets.find((x) => x.id === link.b)?.type ?? "switch"];
                      const dx = b.x - a.x;
                      const dy = b.y - a.y;
                      const dist = Math.hypot(dx, dy) || 1;
                      const ux = dx / dist;
                      const uy = dy / dist;
                      const focused = neighbors
                        ? neighbors.has(link.a) && neighbors.has(link.b)
                        : false;
                      return (
                        <line
                          key={link.id}
                          x1={a.x + ux * radiusA}
                          y1={a.y + uy * radiusA}
                          x2={b.x - ux * radiusB}
                          y2={b.y - uy * radiusB}
                          stroke={LINK_COLOR[link.status]}
                          strokeWidth={1.4 + Math.min(2, link.count * 0.55)}
                          strokeLinecap="round"
                          strokeDasharray={link.status === "active" ? undefined : "6 4"}
                          opacity={linkOpacity(link)}
                          className={focused ? "animate-dash-flow" : undefined}
                        />
                      );
                    })}

                    {assets.map((asset) => {
                      const point = layout[asset.id];
                      if (!point) return null;
                      const radius = NODE_RADIUS[asset.type];
                      const theme = STATUS_THEME[asset.status];
                      const isSelected = selectedId === asset.id;
                      const isFocused = focusId === asset.id;
                      return (
                        <g
                          key={asset.id}
                          transform={`translate(${point.x} ${point.y})`}
                          opacity={nodeOpacity(asset)}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            setSelectedId(asset.id);
                          }}
                          onMouseEnter={() => setHoveredId(asset.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedId(asset.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-label={`${asset.name}, ${TYPE_LABELS[asset.type]}, ${theme.label}`}
                          className="cursor-pointer focus:outline-none"
                        >
                          {isFocused && (
                            <circle r={radius + 9} fill={theme.fill} opacity={0.16} />
                          )}
                          {isSelected && (
                            <circle
                              r={radius + 6}
                              fill="none"
                              stroke={theme.stroke}
                              strokeWidth={1.5}
                              strokeDasharray="3 3"
                            />
                          )}
                          <circle
                            r={radius}
                            fill={theme.fill}
                            stroke={theme.stroke}
                            strokeWidth={2}
                          />
                          <text
                            textAnchor="middle"
                            y={4.5}
                            fontSize={13}
                            fontWeight={700}
                            fill="#ffffff"
                          >
                            {TYPE_LETTER[asset.type]}
                          </text>
                          <text
                            textAnchor="middle"
                            y={radius + 16}
                            fontSize={11}
                            fontWeight={600}
                            className="fill-zinc-700 dark:fill-zinc-300"
                          >
                            {truncate(asset.name, 20)}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </svg>
              )}

              {!loading && assets.length > 0 && (
                <div className="glass-card-strong pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2 rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {(Object.keys(STATUS_THEME) as AssetStatus[]).map((status) => (
                    <span key={status} className="inline-flex items-center gap-1">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: STATUS_THEME[status].fill }}
                      />
                      {STATUS_THEME[status].label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="glass-card p-4">
              <h2 className="text-sm font-semibold tracking-tight">
                {selectedAsset ? "Asset inspector" : "Select a node"}
              </h2>
              {selectedAsset ? (
                <div className="mt-3 space-y-3 text-sm">
                  <div>
                    <p className="text-base font-semibold">{selectedAsset.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {TYPE_LABELS[selectedAsset.type]}
                      {selectedAsset.asset_tag ? ` · ${selectedAsset.asset_tag}` : ""}
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">Status</dt>
                      <dd className="mt-0.5 inline-flex items-center gap-1.5 font-medium capitalize">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: STATUS_THEME[selectedAsset.status].fill }}
                        />
                        {selectedAsset.status}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">Ports</dt>
                      <dd className="mt-0.5 font-medium">
                        {portsByAsset.get(selectedAsset.id)?.length ?? 0}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">IP address</dt>
                      <dd className="mt-0.5 font-mono text-[11px]">
                        {selectedAsset.ip_address ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-400">Location</dt>
                      <dd className="mt-0.5 truncate">
                        {selectedAsset.location ?? "—"}
                      </dd>
                    </div>
                  </dl>
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Connections ({selectedCables.length})
                    </p>
                    {selectedCables.length === 0 ? (
                      <p className="text-xs text-zinc-500">
                        No cables recorded for this asset.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {selectedCables.slice(0, 5).map((cable) => {
                          const isA = cable.endpoint_a.assets.id === selectedAsset.id;
                          const local = isA ? cable.endpoint_a : cable.endpoint_b;
                          const peer = isA ? cable.endpoint_b : cable.endpoint_a;
                          return (
                            <li
                              key={cable.id}
                              className="rounded-lg border border-slate-200/60 bg-white/40 px-2.5 py-1.5 text-xs backdrop-blur dark:border-white/10 dark:bg-white/5"
                            >
                              <span className="font-mono text-[10px] text-zinc-500">
                                P{local.port_number} → P{peer.port_number}
                              </span>
                              <span className="block truncate font-medium">
                                {peer.assets.name}
                              </span>
                            </li>
                          );
                        })}
                        {selectedCables.length > 5 && (
                          <li className="text-xs text-zinc-500">
                            +{selectedCables.length - 5} more
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Click any device to see its ports, status and cable peers.
                </p>
              )}
            </section>

            <section className="glass-card p-4">
              <h2 className="text-sm font-semibold tracking-tight">Health signals</h2>
              <ul className="mt-2 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                <li className="flex items-center justify-between gap-2">
                  <span>Assets on map</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {assets.length}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span>Cable links</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {links.length}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span>Unconnected assets</span>
                  <span
                    className={`font-semibold ${
                      isolated.length > 0
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {isolated.length}
                  </span>
                </li>
              </ul>
              {isolated.length > 0 && (
                <div className="mt-3 border-t border-slate-200/60 pt-2 dark:border-white/10">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                    Needs attention
                  </p>
                  <ul className="mt-1 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                    {isolated.slice(0, 4).map((asset) => (
                      <li key={asset.id} className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <button
                          type="button"
                          onClick={() => setSelectedId(asset.id)}
                          className="truncate text-left hover:underline"
                        >
                          {asset.name}
                        </button>
                      </li>
                    ))}
                    {isolated.length > 4 && (
                      <li className="text-zinc-500">+{isolated.length - 4} more</li>
                    )}
                  </ul>
                </div>
              )}
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
