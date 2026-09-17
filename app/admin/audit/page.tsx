"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AuditLog,
  AuditLogAction,
  AuditTableName,
  fetchAuditLogs,
} from "@/lib/queries";
import ProtectRole, { ReadOnlyNotice } from "@/app/components/ProtectRole";

const TABLE_LABELS: Record<AuditTableName | "all", string> = {
  all: "All tables",
  assets: "Assets",
  ports: "Ports",
  cables: "Cables",
  maintenance_logs: "Maintenance",
  profiles: "Profiles",
};

const ACTION_STYLES: Record<AuditLogAction, string> = {
  INSERT: "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300",
};

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-700";

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

function ChangeSummary({ log }: { log: AuditLog }) {
  const oldData = log.changes?.old;
  const newData = log.changes?.new;

  if (log.action === "INSERT") {
    return (
      <div className="space-y-1">
        {Object.entries(newData ?? {}).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-3 text-xs">
            <span className="text-zinc-500">{key}</span>
            <span className="truncate font-mono text-zinc-800 dark:text-zinc-200">
              {value == null ? "—" : String(value)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (log.action === "UPDATE") {
    const changedKeys = new Set([
      ...Object.keys(newData ?? {}),
      ...Object.keys(oldData ?? {}),
    ]);
    const diffs = [...changedKeys].filter(
      (key) =>
        JSON.stringify((oldData ?? {})[key]) !==
        JSON.stringify((newData ?? {})[key])
    );
    return (
      <div className="space-y-1">
        {diffs.length === 0 && (
          <p className="text-xs text-zinc-500">No field changes recorded.</p>
        )}
        {diffs.map((key) => (
          <div key={key} className="text-xs">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {key}
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              <span className="text-red-700 line-through dark:text-red-400">
                {oldData?.[key] == null ? "—" : String(oldData[key])}
              </span>
              <span className="text-green-700 dark:text-green-400">
                {newData?.[key] == null ? "—" : String(newData[key])}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {Object.entries(oldData ?? {}).map(([key, value]) => (
        <div key={key} className="flex justify-between gap-3 text-xs">
          <span className="text-zinc-500">{key}</span>
          <span className="truncate font-mono text-zinc-800 dark:text-zinc-200">
            {value == null ? "—" : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AuditAdminPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState<AuditTableName | "all">("all");
  const [actionFilter, setActionFilter] = useState<AuditLogAction | "all">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAuditLogs().then((res) => {
      if (res.error) setError(res.error);
      else setLogs(res.data ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(
    () =>
      logs.filter(
        (log) =>
          (tableFilter === "all" || log.table_name === tableFilter) &&
          (actionFilter === "all" || log.action === actionFilter)
      ),
    [logs, tableFilter, actionFilter]
  );

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <ProtectRole
        allowedRoles={["admin"]}
        fallback={
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
            <header className="mb-6 sm:mb-8">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Audit Log
              </h1>
            </header>
            <ReadOnlyNotice message="Only administrators can view the audit trail." />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              <Link
                href="/"
                className="font-medium underline-offset-2 hover:underline"
              >
                Back to Dashboard
              </Link>
            </p>
          </main>
        }
      >
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
          <header className="mb-6 sm:mb-8">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Audit Log
            </h1>
            <p className="mt-1 text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
              Immutable history of every data mutation, recorded at the database layer.
            </p>
          </header>

          {error && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                aria-label="Dismiss error"
                className="shrink-0 rounded p-0.5 text-red-400 transition-colors hover:text-red-700"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-4 py-4 sm:px-6 dark:border-zinc-800">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-medium">Recent Activity</h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {loading ? "Loading..." : `${filtered.length} of ${logs.length} events`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={tableFilter}
                    onChange={(e) =>
                      setTableFilter(e.target.value as AuditTableName | "all")
                    }
                    aria-label="Filter by table"
                    className={inputClass}
                  >
                    {Object.entries(TABLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={actionFilter}
                    onChange={(e) =>
                      setActionFilter(e.target.value as AuditLogAction | "all")
                    }
                    aria-label="Filter by action"
                    className={inputClass}
                  >
                    <option value="all">All actions</option>
                    <option value="INSERT">INSERT</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="px-6 py-10 text-center text-sm text-zinc-500">
                Loading audit trail...
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-zinc-500">
                {logs.length === 0
                  ? "No recorded activity yet. Mutations made through the app are captured here automatically."
                  : "No events match your filters."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[720px] divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">When</th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">Table</th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">Action</th>
                      <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 md:table-cell md:px-6 dark:text-zinc-400">Actor</th>
                      <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 lg:table-cell lg:px-6 dark:text-zinc-400">Record</th>
                      <th className="px-4 py-3 text-right font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filtered.map((log) => {
                      const open = expanded.has(log.id);
                      return (
                        <Fragment key={log.id}>
                          <tr className="align-top hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                            <td className="whitespace-nowrap px-4 py-3 text-zinc-600 sm:px-6 dark:text-zinc-400">
                              {formatDateTime(log.created_at)}
                            </td>
                            <td className="px-4 py-3 sm:px-6">
                              <span className="font-medium">
                                {TABLE_LABELS[log.table_name]}
                              </span>
                            </td>
                            <td className="px-4 py-3 sm:px-6">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_STYLES[log.action]}`}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td className="hidden px-4 py-3 text-zinc-600 md:table-cell md:px-6 dark:text-zinc-400">
                              {log.actor_profiles?.display_name ?? "System"}
                            </td>
                            <td className="hidden px-4 py-3 font-mono text-xs text-zinc-500 lg:table-cell lg:px-6">
                              {log.record_id.slice(0, 8)}…
                            </td>
                            <td className="px-4 py-3 sm:px-6">
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(log.id)}
                                  aria-expanded={open}
                                  className="rounded-md border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                >
                                  {open ? "Hide" : "View"}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {open && (
                            <tr className="border-t border-zinc-100 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-900/60">
                              <td
                                colSpan={6}
                                className="px-4 py-4 sm:px-6"
                              >
                                <ChangeSummary log={log} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </ProtectRole>
    </div>
  );
}