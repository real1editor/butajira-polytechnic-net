"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import {
  AuditLog,
  AuditLogAction,
  AuditTableName,
  fetchAuditLogs,
} from "@/lib/queries";
import ProtectRole, { ReadOnlyNotice } from "@/app/components/ProtectRole";
import ErrorBanner from "@/app/components/ErrorBanner";
import { inputClass } from "@/lib/ui";
import { formatDateTime } from "@/lib/utils";

const TABLE_LABELS: Record<AuditTableName | "all", string> = {
  all: "All tables",
  assets: "Assets",
  ports: "Ports",
  cables: "Cables",
  maintenance_logs: "Maintenance",
  profiles: "Profiles",
};

const ACTION_STYLES: Record<AuditLogAction, string> = {
  INSERT:
    "border border-emerald-400/30 bg-emerald-400/15 text-emerald-700 dark:text-emerald-300",
  UPDATE:
    "border border-cyan-400/30 bg-cyan-400/15 text-cyan-700 dark:text-cyan-300",
  DELETE:
    "border border-rose-400/30 bg-rose-400/15 text-rose-700 dark:text-rose-300",
};

type ChangeData = {
  old?: Record<string, unknown>;
  new?: Record<string, unknown>;
};

const HIDDEN_DIFF_FIELDS = new Set(["id", "created_at", "updated_at"]);

function readChanges(changes: unknown): ChangeData {
  if (typeof changes === "string") {
    try {
      const parsed = JSON.parse(changes);
      return parsed && typeof parsed === "object" ? (parsed as ChangeData) : {};
    } catch {
      return {};
    }
  }
  return changes && typeof changes === "object" ? (changes as ChangeData) : {};
}

function rowLabel(row: Record<string, unknown> | undefined): string | null {
  if (!row) return null;
  for (const key of ["name", "display_name", "asset_tag", "email"]) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function changedFields(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
): string[] {
  return [...new Set([...Object.keys(newData), ...Object.keys(oldData)])].filter(
    (key) =>
      !HIDDEN_DIFF_FIELDS.has(key) &&
      JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])
  );
}

function describeChange(log: AuditLog): string {
  const { old: oldData = {}, new: newData = {} } = readChanges(log.changes);

  if (log.action === "INSERT") {
    const label = rowLabel(newData);
    return label ? `Created "${label}"` : "Row created";
  }

  if (log.action === "DELETE") {
    const label = rowLabel(oldData);
    return label ? `Deleted "${label}"` : "Row deleted";
  }

  const fields = changedFields(oldData, newData);
  if (fields.length === 0) return "No field changes";
  const preview = fields.slice(0, 3).join(", ");
  return `${fields.length} field${fields.length === 1 ? "" : "s"} changed: ${preview}${
    fields.length > 3 ? "…" : ""
  }`;
}

function ChangeSummary({ log }: { log: AuditLog }) {
  const { old: oldData = {}, new: newData = {} } = readChanges(log.changes);

  if (log.action === "INSERT") {
    const entries = Object.entries(newData);
    return (
      <div className="space-y-1">
        {entries.length === 0 && (
          <p className="text-xs text-zinc-500">No field data recorded.</p>
        )}
        {entries.map(([key, value]) => (
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
    const diffs = changedFields(oldData, newData);
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
                {oldData[key] == null ? "—" : String(oldData[key])}
              </span>
              <span className="text-green-700 dark:text-green-400">
                {newData[key] == null ? "—" : String(newData[key])}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const entries = Object.entries(oldData);
  return (
    <div className="space-y-1">
      {entries.length === 0 && (
        <p className="text-xs text-zinc-500">No field data recorded.</p>
      )}
      {entries.map(([key, value]) => (
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

const PAGE_SIZE = 25;

export default function AuditAdminPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState<AuditTableName | "all">("all");
  const [actionFilter, setActionFilter] = useState<AuditLogAction | "all">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let active = true;

    fetchAuditLogs({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      table: tableFilter,
      action: actionFilter,
    }).then((res) => {
      if (!active) return;
      if (res.error) {
        setError(res.error);
        setLogs([]);
        setTotal(0);
      } else {
        setLogs(res.data ?? []);
        setTotal(res.count ?? 0);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [actionFilter, page, tableFilter]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, total);
  const hasFilters = tableFilter !== "all" || actionFilter !== "all";

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-1 flex-col font-sans text-slate-900 dark:text-slate-100">
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

          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

          <section className="glass-card overflow-hidden">
            <div className="border-b border-slate-200/60 px-4 py-4 sm:px-6 dark:border-white/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-medium">Recent Activity</h2>
                  <p
                    className="text-sm text-zinc-600 dark:text-zinc-400"
                    aria-live="polite"
                  >
                    {loading
                      ? "Loading..."
                      : `${total} event${total === 1 ? "" : "s"}${
                          hasFilters ? " matching filters" : ""
                        }`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={tableFilter}
                    onChange={(e) => {
                      setLoading(true);
                      setTableFilter(e.target.value as AuditTableName | "all");
                      setPage(0);
                    }}
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
                    onChange={(e) => {
                      setLoading(true);
                      setActionFilter(e.target.value as AuditLogAction | "all");
                      setPage(0);
                    }}
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
            ) : logs.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-zinc-500">
                {hasFilters
                  ? "No events match your filters."
                  : "No recorded activity yet. Mutations made through the app are captured here automatically."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[720px] divide-y divide-slate-200/60 text-sm dark:divide-white/10">
                  <thead className="bg-transparent">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">When</th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">Table</th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">Action</th>
                      <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 md:table-cell md:px-6 dark:text-zinc-400">Actor</th>
                      <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 lg:table-cell lg:px-6 dark:text-zinc-400">Record</th>
                      <th className="px-4 py-3 text-right font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
                    {logs.map((log) => {
                      const open = expanded.has(log.id);
                      return (
                        <Fragment key={log.id}>
                          <tr className="align-top hover:bg-cyan-400/5 dark:hover:bg-cyan-400/5">
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
                              {log.record_id ? `${log.record_id.slice(0, 8)}…` : "—"}
                            </td>
                            <td className="px-4 py-3 sm:px-6">
                              <div className="flex items-center justify-end gap-3">
                                <span className="hidden max-w-[18rem] truncate text-xs text-zinc-500 sm:inline dark:text-zinc-400">
                                  {describeChange(log)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(log.id)}
                                  aria-expanded={open}
                                  className="glass-chip rounded-lg px-3 py-1 text-xs font-medium transition-colors hover:text-cyan-700 dark:hover:text-cyan-300"
                                >
                                  {open ? "Hide" : "View"}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {open && (
                            <tr className="border-t border-slate-200/50 bg-white/30 dark:border-white/10 dark:bg-white/5">
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

            {!loading && total > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-200/60 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-white/10">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Showing {rangeStart}–{rangeEnd} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      setPage((value) => Math.max(0, value - 1));
                    }}
                    disabled={page === 0 || loading}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    Previous
                  </button>
                  <span className="min-w-[7rem] text-center text-xs text-zinc-500 dark:text-zinc-400">
                    Page {page + 1} of {pageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      setPage((value) => Math.min(pageCount - 1, value + 1));
                    }}
                    disabled={page >= pageCount - 1 || loading}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </ProtectRole>
    </div>
  );
}