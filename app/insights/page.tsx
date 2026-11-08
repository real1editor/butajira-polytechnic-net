"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Asset,
  CableJoined,
  MaintenanceJoined,
  PortJoined,
  TYPE_LABELS,
  fetchAssets,
  fetchCables,
  fetchMaintenanceLogs,
  fetchPorts,
} from "@/lib/queries";
import {
  buildInsights,
  computeNetworkHealth,
  computePortUtilization,
  costTrend,
  outcomeCounts,
  statusCounts,
  totalMaintenanceCost,
  typeCounts,
} from "@/lib/analytics";
import { DonutChart, HealthGauge, ProgressMeter, TrendChart } from "@/app/components/Charts";
import { PanelSkeleton } from "@/app/components/Skeleton";
import ErrorBanner from "@/app/components/ErrorBanner";
import { useLiveVersion, useRealtime } from "@/app/contexts/RealtimeContext";
import { useToast } from "@/app/contexts/ToastContext";
import { exportAssetsCsv, exportCablesCsv, exportMaintenanceCsv } from "@/lib/export";
import { formatCurrency } from "@/lib/utils";

const STATUS_COLORS: Record<Asset["status"], string> = {
  active: "#10b981",
  maintenance: "#f59e0b",
  offline: "#ef4444",
  decommissioned: "#a1a1aa",
};

const TYPE_COLORS: Record<Asset["type"], string> = {
  switch: "#3b82f6",
  router: "#8b5cf6",
  patch_panel: "#14b8a6",
};

const OUTCOME_COLORS: Record<MaintenanceJoined["outcome"], string> = {
  completed: "#10b981",
  pending: "#f59e0b",
  failed: "#ef4444",
};

const SEVERITY_STYLES: Record<
  string,
  { badge: string; dot: string; label: string }
> = {
  critical: {
    badge: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
    dot: "bg-red-500",
    label: "Critical",
  },
  warning: {
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    dot: "bg-amber-500",
    label: "Attention",
  },
  info: {
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    dot: "bg-blue-500",
    label: "Notice",
  },
  success: {
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
    label: "Healthy",
  },
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export default function InsightsPage() {
  const version = useLiveVersion();
  const { connected } = useRealtime();
  const { success } = useToast();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [ports, setPorts] = useState<PortJoined[]>([]);
  const [cables, setCables] = useState<CableJoined[]>([]);
  const [logs, setLogs] = useState<MaintenanceJoined[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchAssets(), fetchPorts(), fetchCables(), fetchMaintenanceLogs()]).then(
      ([assetRes, portRes, cableRes, logRes]) => {
        if (!active) return;
        if (assetRes.error) setError(assetRes.error);
        else setAssets(assetRes.data ?? []);
        if (portRes.error) setError(portRes.error);
        else setPorts(portRes.data ?? []);
        if (cableRes.error) setError(cableRes.error);
        else setCables(cableRes.data ?? []);
        if (logRes.error) setError(logRes.error);
        else setLogs(logRes.data ?? []);
        setLoading(false);
      }
    );
    return () => {
      active = false;
    };
  }, [version]);

  const health = useMemo(
    () => computeNetworkHealth(assets, ports, cables, logs),
    [assets, cables, logs, ports]
  );
  const insights = useMemo(
    () => buildInsights(assets, ports, cables, logs),
    [assets, cables, logs, ports]
  );
  const status = useMemo(() => statusCounts(assets), [assets]);
  const types = useMemo(() => typeCounts(assets), [assets]);
  const outcomes = useMemo(() => outcomeCounts(logs), [logs]);
  const utilization = useMemo(
    () => computePortUtilization(assets, ports, cables).filter((row) => row.total > 0),
    [assets, cables, ports]
  );
  const trend = useMemo(() => costTrend(logs), [logs]);
  const totalCost = useMemo(() => totalMaintenanceCost(logs), [logs]);

  const statusData = (Object.keys(status) as Asset["status"][]).map((key) => ({
    label: capitalize(key),
    value: status[key],
    color: STATUS_COLORS[key],
  }));
  const typeData = (Object.keys(types) as Asset["type"][]).map((key) => ({
    label: TYPE_LABELS[key],
    value: types[key],
    color: TYPE_COLORS[key],
  }));
  const outcomeData = (Object.keys(outcomes) as MaintenanceJoined["outcome"][]).map((key) => ({
    label: capitalize(key),
    value: outcomes[key],
    color: OUTCOME_COLORS[key],
  }));

  function handleExportAssets() {
    exportAssetsCsv(assets);
    success(`Exported ${assets.length} assets.`);
  }
  function handleExportCables() {
    exportCablesCsv(cables);
    success(`Exported ${cables.length} cables.`);
  }
  function handleExportLogs() {
    exportMaintenanceCsv(logs);
    success(`Exported ${logs.length} maintenance logs.`);
  }

  return (
    <div className="flex flex-1 flex-col font-sans text-slate-900 dark:text-slate-100">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
              <span className={`live-dot inline-flex h-1.5 w-1.5 rounded-full ${connected ? "text-cyan-400" : "text-amber-500"}`} />
              {connected ? "Live intelligence" : "Live sync paused"}
            </span>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Network Intelligence
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
              A live health score, prioritized recommendations, and capacity analytics
              computed from your inventory, cabling, and maintenance history.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportAssets}
              disabled={assets.length === 0}
              className="btn-secondary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export assets
            </button>
            <button
              type="button"
              onClick={handleExportCables}
              disabled={cables.length === 0}
              className="btn-secondary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export cables
            </button>
            <button
              type="button"
              onClick={handleExportLogs}
              disabled={logs.length === 0}
              className="btn-secondary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export logs
            </button>
          </div>
        </header>

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <PanelSkeleton rows={6} />
            <PanelSkeleton rows={6} />
            <div className="lg:col-span-2 grid gap-4 md:grid-cols-3">
              <PanelSkeleton rows={4} />
              <PanelSkeleton rows={4} />
              <PanelSkeleton rows={4} />
            </div>
            <div className="lg:col-span-2">
              <PanelSkeleton rows={5} />
            </div>
          </div>
        ) : (
          <>
            <section className="mb-4 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="flex flex-col items-center glass-card p-5 sm:p-6">
                <HealthGauge score={health.score} grade={health.grade} />
                <p className="mt-3 text-center text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  {health.summary}
                </p>
                <p className="mt-1 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                  Weighted from {health.components.length} live signals
                </p>
                <div className="mt-5 w-full space-y-3">
                  {health.components.map((component) => {
                    const tone =
                      component.score >= 80
                        ? "bg-emerald-500"
                        : component.score >= 60
                          ? "bg-amber-500"
                          : "bg-red-500";
                    return (
                      <div key={component.key}>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">
                            {component.label}
                            <span className="ml-1 text-[10px] font-normal text-zinc-400">
                              {component.weight}%
                            </span>
                          </span>
                          <span className="font-semibold tabular-nums">{component.score}</span>
                        </div>
                        <div className="mt-1">
                          <ProgressMeter
                            value={component.score}
                            tone={tone}
                            label={component.label}
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                          {component.detail}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="glass-card p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">
                      Recommended actions
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Generated automatically from the current state of the network.
                    </p>
                  </div>
                  <span className="glass-chip rounded-full px-2 py-0.5 text-[10px] font-medium">
                    {insights.length} signal{insights.length === 1 ? "" : "s"}
                  </span>
                </div>

                <ul className="mt-4 space-y-2.5">
                  {insights.map((insight) => {
                    const style = SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.info;
                    return (
                      <li
                        key={insight.id}
                        className="flex items-start gap-3 rounded-lg border border-slate-200/60 bg-white/40 p-3 backdrop-blur transition-colors hover:border-cyan-400/30 dark:border-white/10 dark:bg-white/5 dark:hover:border-cyan-400/30"
                      >
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                              {insight.title}
                            </p>
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${style.badge}`}
                            >
                              {style.label}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            {insight.detail}
                          </p>
                        </div>
                        {insight.href && (
                          <Link
                            href={insight.href}
                            className="shrink-0 self-center text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
                          >
                            {insight.actionLabel ?? "Open"} →
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>

            <section className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="glass-card p-5">
                <h2 className="text-sm font-semibold tracking-tight">Assets by status</h2>
                <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                  {assets.length} registered asset{assets.length === 1 ? "" : "s"}
                </p>
                <DonutChart data={statusData} centerLabel="Assets" centerValue={assets.length} />
              </div>

              <div className="glass-card p-5">
                <h2 className="text-sm font-semibold tracking-tight">Asset mix</h2>
                <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                  Hardware distribution across the campus
                </p>
                <DonutChart data={typeData} centerLabel="Types" centerValue={assets.length} />
              </div>

              <div className="glass-card p-5 md:col-span-2 xl:col-span-1">
                <h2 className="text-sm font-semibold tracking-tight">Maintenance outcomes</h2>
                <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                  {logs.length} recorded log{logs.length === 1 ? "" : "s"}
                </p>
                {logs.length === 0 ? (
                  <p className="text-sm text-zinc-500">No maintenance history yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {outcomeData.map((row) => {
                      const pct = logs.length > 0 ? Math.round((row.value / logs.length) * 100) : 0;
                      const tone =
                        row.label === "Completed"
                          ? "bg-emerald-500"
                          : row.label === "Pending"
                            ? "bg-amber-500"
                            : "bg-red-500";
                      return (
                        <li key={row.label}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-zinc-700 dark:text-zinc-200">
                              {row.label}
                            </span>
                            <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                              {row.value} · {pct}%
                            </span>
                          </div>
                          <div className="mt-1">
                            <ProgressMeter value={pct} tone={tone} label={row.label} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            <section className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div className="glass-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold tracking-tight">Maintenance spend</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Last 6 calendar months
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold tabular-nums">{formatCurrency(totalCost)}</p>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-400">
                      All-time total
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <TrendChart
                    data={trend}
                    color="#6366f1"
                    formatter={(value) => formatCurrency(value)}
                  />
                </div>
              </div>

              <div className="glass-card p-5">
                <h2 className="text-sm font-semibold tracking-tight">Capacity snapshot</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Highest port utilization first
                </p>
                {utilization.length === 0 ? (
                  <p className="mt-4 text-sm text-zinc-500">Add ports to see utilization.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {utilization.slice(0, 5).map((row) => {
                      const tone =
                        row.pct >= 90
                          ? "bg-red-500"
                          : row.pct >= 70
                            ? "bg-amber-500"
                            : "bg-emerald-500";
                      return (
                        <li key={row.asset.id}>
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <Link
                              href={`/assets/${row.asset.id}`}
                              className="truncate font-medium text-zinc-700 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-200 dark:hover:text-white"
                            >
                              {row.asset.name}
                            </Link>
                            <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
                              {row.used}/{row.total} · {row.pct}%
                            </span>
                          </div>
                          <div className="mt-1">
                            <ProgressMeter value={row.pct} tone={tone} label={row.asset.name} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {utilization.length > 0 && (
                  <Link
                    href="/connections"
                    className="mt-4 inline-block text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    Manage all connections →
                  </Link>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
