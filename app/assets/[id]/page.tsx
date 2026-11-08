"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Asset,
  AssetStatus,
  CableJoined,
  MaintenanceJoined,
  PortJoined,
  STATUS_STYLES,
  TYPE_LABELS,
  fetchAssets,
  fetchCables,
  fetchMaintenanceLogs,
  fetchPorts,
} from "@/lib/queries";
import { usedPortIds } from "@/lib/analytics";
import { useLiveVersion } from "@/app/contexts/RealtimeContext";
import ErrorBanner from "@/app/components/ErrorBanner";
import Barcode from "@/app/components/Barcode";
import { PanelSkeleton } from "@/app/components/Skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_DOT: Record<AssetStatus, string> = {
  active: "bg-emerald-500",
  maintenance: "bg-amber-500",
  offline: "bg-red-500",
  decommissioned: "bg-zinc-400",
};

function sortPorts(a: PortJoined, b: PortJoined) {
  const an = Number.parseInt(a.port_number, 10);
  const bn = Number.parseInt(b.port_number, 10);
  if (!Number.isNaN(an) && !Number.isNaN(bn) && an !== bn) return an - bn;
  return a.port_number.localeCompare(b.port_number);
}

export default function AssetDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id ?? "";
  const version = useLiveVersion();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [ports, setPorts] = useState<PortJoined[]>([]);
  const [cables, setCables] = useState<CableJoined[]>([]);
  const [logs, setLogs] = useState<MaintenanceJoined[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
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
  }, [id, version]);

  const asset = useMemo(() => assets.find((item) => item.id === id) ?? null, [assets, id]);

  const assetPorts = useMemo(
    () => ports.filter((port) => port.asset_id === id).sort(sortPorts),
    [id, ports]
  );

  const used = useMemo(() => usedPortIds(cables), [cables]);

  const connections = useMemo(() => {
    return cables
      .filter(
        (cable) =>
          cable.status !== "decommissioned" &&
          (cable.endpoint_a.assets.id === id || cable.endpoint_b.assets.id === id)
      )
      .map((cable) => {
        const isA = cable.endpoint_a.assets.id === id;
        const local = isA ? cable.endpoint_a : cable.endpoint_b;
        const peer = isA ? cable.endpoint_b : cable.endpoint_a;
        return { cable, local, peer };
      });
  }, [cables, id]);

  const peerByPort = useMemo(() => {
    const map = new Map<
      string,
      { peerAssetId: string; peerAssetName: string; peerPort: string; label: string }
    >();
    for (const { cable, local, peer } of connections) {
      map.set(local.id, {
        peerAssetId: peer.assets.id,
        peerAssetName: peer.assets.name,
        peerPort: peer.port_number,
        label: cable.label,
      });
    }
    return map;
  }, [connections]);

  const assetLogs = useMemo(
    () => logs.filter((log) => log.asset_id === id),
    [id, logs]
  );

  const stats = useMemo(() => {
    const usedCount = assetPorts.filter((port) => used.has(port.id)).length;
    const totalCost = assetLogs.reduce((sum, log) => sum + (Number(log.cost) || 0), 0);
    const lastLog = assetLogs[0] ?? null;
    return {
      ports: assetPorts.length,
      used: usedCount,
      free: assetPorts.length - usedCount,
      connections: connections.length,
      logs: assetLogs.length,
      totalCost,
      lastLog,
      utilization:
        assetPorts.length > 0 ? Math.round((usedCount / assetPorts.length) * 100) : 0,
    };
  }, [assetLogs, assetPorts, connections.length, used]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col font-sans text-slate-900 dark:text-slate-100">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
          <div className="grid gap-4 lg:grid-cols-2">
            <PanelSkeleton rows={5} />
            <PanelSkeleton rows={5} />
            <div className="lg:col-span-2">
              <PanelSkeleton rows={6} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex flex-1 flex-col font-sans text-slate-900 dark:text-slate-100">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-md text-center">
            <span className="mb-3 inline-flex h-3 w-3 rounded-full bg-amber-500" />
            <h1 className="text-2xl font-semibold tracking-tight">Asset not found</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              This asset may have been deleted, or you may not have access to it.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block btn-primary"
            >
              Back to dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col font-sans text-slate-900 dark:text-slate-100">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-4 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <Link
            href="/"
            className="font-medium underline-offset-2 hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
          >
            Dashboard
          </Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-zinc-700 dark:text-zinc-200">{asset.name}</span>
        </div>

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        <header className="glass-card mb-5 overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="glass-chip rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  {TYPE_LABELS[asset.type]}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[asset.status]}`}
                >
                  <span className={`inline-flex h-1.5 w-1.5 rounded-full ${STATUS_DOT[asset.status]}`} />
                  {asset.status}
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                {asset.name}
              </h1>
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                <div>
                  <dt className="inline font-medium text-zinc-400">Tag </dt>
                  <dd className="inline font-mono text-zinc-700 dark:text-zinc-200">
                    {asset.asset_tag || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="inline font-medium text-zinc-400">IP </dt>
                  <dd className="inline font-mono text-zinc-700 dark:text-zinc-200">
                    {asset.ip_address || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="inline font-medium text-zinc-400">Location </dt>
                  <dd className="inline text-zinc-700 dark:text-zinc-200">
                    {asset.location || "—"}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-primary px-3 py-2 text-xs"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5z" />
                </svg>
                Print label
              </button>
              <Link
                href="/topology"
                className="btn-secondary px-3 py-2 text-xs"
              >
                View topology
              </Link>
            </div>
          </div>
        </header>

        <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="glass-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Ports
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.ports}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500">{stats.free} free</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Utilization
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.utilization}%</p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {stats.used} of {stats.ports} in use
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Connections
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.connections}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500">live cable peers</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Maintenance
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.logs}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500">{formatCurrency(stats.totalCost)} spent</p>
          </div>
        </section>

        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          <section className="glass-card p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight">Port map</h2>
              <span className="text-[11px] text-zinc-400">
                {stats.used} used · {stats.free} free
              </span>
            </div>
            {assetPorts.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">
                No ports recorded. Ports are generated automatically for new assets.
              </p>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                  {assetPorts.map((port) => {
                    const peer = peerByPort.get(port.id);
                    const isUsed = used.has(port.id);
                    return (
                      <div
                        key={port.id}
                        title={
                          peer
                            ? `Port ${port.port_number} (${port.port_type}) → ${peer.peerAssetName} port ${peer.peerPort}`
                            : `Port ${port.port_number} (${port.port_type}) — free`
                        }
                        className={`flex flex-col rounded-md border px-1.5 py-1 text-center ${
                          isUsed
                            ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-300"
                            : "border-slate-300/60 bg-white/40 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
                        }`}
                      >
                        <span className="truncate font-mono text-[11px] font-semibold">
                          {port.port_number}
                        </span>
                        <span className="truncate text-[9px] uppercase tracking-wide opacity-70">
                          {port.port_type}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> In use
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" /> Free
                  </span>
                </div>
              </>
            )}
          </section>

          <section className="glass-card p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight">Cable connections</h2>
              <Link
                href="/connections"
                className="text-[11px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Manage →
              </Link>
            </div>
            {connections.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">
                This asset has no live cables. Map a port on the Connections page.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-200/50 dark:divide-white/5">
                {connections.map(({ cable, local, peer }) => (
                  <li key={cable.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                        <Link
                          href={`/assets/${peer.assets.id}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {peer.assets.name}
                        </Link>
                      </p>
                      <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span className="font-mono">P{local.port_number}</span> → {" "}
                        <span className="font-mono">P{peer.port_number}</span> · {cable.cable_type}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                        cable.status === "active"
                          ? "border border-emerald-400/30 bg-emerald-400/15 text-emerald-700 dark:text-emerald-300"
                          : "border border-cyan-400/30 bg-cyan-400/15 text-cyan-700 dark:text-cyan-300"
                      }`}
                    >
                      {cable.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="mb-5 glass-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-tight">Maintenance timeline</h2>
            <Link
              href="/maintenance"
              className="text-[11px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              All logs →
            </Link>
          </div>
          {assetLogs.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              No maintenance history for this asset yet.
            </p>
          ) : (
            <ol className="mt-4 space-y-4">
              {assetLogs.slice(0, 8).map((log) => (
                <li key={log.id} className="relative pl-6">
                  <span
                    className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ${
                      log.outcome === "completed"
                        ? "bg-emerald-500"
                        : log.outcome === "failed"
                          ? "bg-red-500"
                          : "bg-amber-500"
                    }`}
                  />
                  <span className="absolute left-[4px] top-4 h-[calc(100%+0.5rem)] w-px bg-slate-200/70 dark:bg-white/10" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                      {log.title}
                    </p>
                    <span className="text-[11px] text-zinc-400">{formatDate(log.log_date)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {log.description || log.action_taken || "No description recorded."}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-zinc-400">
                    <span className="capitalize">{log.outcome}</span>
                    <span className="capitalize">{log.maintenance_type}</span>
                    {log.performed_by && <span>by {log.performed_by}</span>}
                    {log.cost != null && <span>{formatCurrency(log.cost)}</span>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="print-label glass-card p-5">
          <div className="mb-3 flex items-center justify-between gap-2 print:hidden">
            <h2 className="text-sm font-semibold tracking-tight">Asset label</h2>
            <span className="text-[10px] uppercase tracking-wide text-zinc-400">
              Printable · Code 39
            </span>
          </div>
          <div className="label-card mx-auto max-w-md rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-center text-zinc-900 dark:border-zinc-600 dark:bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-2 text-left">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Butajira Polytechnic College
                </p>
                <p className="text-sm font-bold leading-tight">{asset.name}</p>
              </div>
              <span className="rounded bg-zinc-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                {TYPE_LABELS[asset.type]}
              </span>
            </div>
            <div className="mt-2 flex justify-center overflow-hidden">
              <Barcode value={asset.asset_tag || asset.name} height={52} moduleWidth={2} />
            </div>
            <div className="mt-2 flex items-center justify-between text-left text-[9px] text-zinc-600">
              <span className="font-mono">{asset.ip_address || "No IP"}</span>
              <span className="truncate">{asset.location || "No location"}</span>
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] text-zinc-400 print:hidden">
            Print at 100% scale for scannable labels. The barcode encodes the asset tag.
          </p>
        </section>
      </main>
    </div>
  );
}
