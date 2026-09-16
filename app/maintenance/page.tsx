"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Asset,
  MaintenanceJoined,
  MaintenanceOutcome,
  MaintenanceType,
  MAINTENANCE_TYPE_LABELS,
  OUTCOME_STYLES,
  TYPE_LABELS,
  deleteMaintenanceLog,
  fetchAssets,
  fetchMaintenanceLogs,
  insertMaintenanceLog,
} from "@/lib/queries";
import { usePermissions } from "@/app/contexts/AuthContext";
import ProtectRole, { ReadOnlyNotice } from "@/app/components/ProtectRole";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import Toast from "@/app/components/Toast";

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-700";

const today = () => new Date().toISOString().slice(0, 10);

const formatDate = (iso: string) => {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

export default function MaintenancePage() {
  const { canManage, canDelete } = usePermissions();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [logs, setLogs] = useState<MaintenanceJoined[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deleting, setDeleting] = useState<MaintenanceJoined | null>(null);

  const [form, setForm] = useState({
    asset_id: "",
    title: "",
    maintenance_type: "corrective" as MaintenanceType,
    log_date: today(),
    description: "",
    action_taken: "",
    performed_by: "",
    cost: "",
    outcome: "completed" as MaintenanceOutcome,
  });

  useEffect(() => {
    Promise.all([fetchAssets(), fetchMaintenanceLogs()]).then(
      ([assetRes, logRes]) => {
        if (assetRes.error) setError(assetRes.error);
        else setAssets(assetRes.data ?? []);

        if (logRes.error) setError(logRes.error);
        else setLogs(logRes.data ?? []);

        setLoading(false);
      }
    );
  }, []);

  async function refreshData() {
    const [assetRes, logRes] = await Promise.all([
      fetchAssets(),
      fetchMaintenanceLogs(),
    ]);
    if (assetRes.error) setError(assetRes.error);
    else setAssets(assetRes.data ?? []);
    if (logRes.error) setError(logRes.error);
    else setLogs(logRes.data ?? []);
  }

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.asset_id || !form.title.trim()) return;
    setSaving(true);
    setError(null);

    const cost = Number(form.cost);
    const insertError = await insertMaintenanceLog({
      asset_id: form.asset_id,
      log_date: form.log_date,
      maintenance_type: form.maintenance_type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      action_taken: form.action_taken.trim() || null,
      performed_by: form.performed_by.trim() || null,
      cost: form.cost && Number.isFinite(cost) ? cost : null,
      outcome: form.outcome,
    });

    if (insertError) {
      setError(insertError);
      setSaving(false);
      return;
    }

    setForm({
      asset_id: "",
      title: "",
      maintenance_type: "corrective",
      log_date: today(),
      description: "",
      action_taken: "",
      performed_by: "",
      cost: "",
      outcome: "completed",
    });
    setToast({ type: "success", message: "Maintenance log saved." });
    setSaving(false);
    refreshData();
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    setError(null);

    const deleteError = await deleteMaintenanceLog(deleting.id);
    if (deleteError) setError(deleteError);
    else {
      setToast({ type: "success", message: "Log deleted." });
      await refreshData();
    }

    setDeleting(null);
    setSaving(false);
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          open={!!deleting}
          title="Delete maintenance log"
          message={`Delete "${deleting.title}"? This action cannot be undone.`}
          confirmLabel="Delete"
          busy={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Maintenance Logs
          </h1>
          <p className="mt-1 text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
            Preventive, corrective, and inspection history for every asset
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

        <ProtectRole
          allowedRoles={["admin", "technician"]}
          fallback={
            <ReadOnlyNotice message="Maintenance logs are shown in read-only mode. Contact an administrator to add or edit logs." />
          }
        >
          <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:mb-8 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-medium">Log Maintenance</h2>
            <form
              onSubmit={handleSubmit}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Asset
                <select
                  required
                  value={form.asset_id}
                  onChange={(e) => handleChange("asset_id", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select asset...</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({TYPE_LABELS[asset.type]})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Maintenance Type
                <select
                  value={form.maintenance_type}
                  onChange={(e) => handleChange("maintenance_type", e.target.value)}
                  className={inputClass}
                >
                  {Object.entries(MAINTENANCE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Date
                <input
                  type="date"
                  value={form.log_date}
                  onChange={(e) => handleChange("log_date", e.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Title
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="e.g. Fan replacement, firmware update"
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Performed By
                <input
                  type="text"
                  value={form.performed_by}
                  onChange={(e) => handleChange("performed_by", e.target.value)}
                  placeholder="e.g. IT Technician, vendor"
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Cost (ETB)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => handleChange("cost", e.target.value)}
                  placeholder="e.g. 1250.00"
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Outcome
                <select
                  value={form.outcome}
                  onChange={(e) => handleChange("outcome", e.target.value)}
                  className={inputClass}
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 sm:col-span-2 dark:text-zinc-300">
                Description
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Details of the work performed"
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 sm:col-span-3 dark:text-zinc-300">
                Action Taken
                <textarea
                  rows={2}
                  value={form.action_taken}
                  onChange={(e) => handleChange("action_taken", e.target.value)}
                  placeholder="What was actually done (auto-fills with 'No action recorded' if blank)"
                  className={inputClass}
                />
              </label>

              <div className="flex items-end sm:col-span-3">
                <button
                  type="submit"
                  disabled={saving || !form.asset_id}
                  className="w-full rounded-md bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {saving ? "Saving..." : "Add Log"}
                </button>
              </div>
            </form>
          </section>
        </ProtectRole>

        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-4 py-4 sm:px-6 dark:border-zinc-800">
            <h2 className="text-lg font-medium">Maintenance History</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {loading ? "Loading..." : `${logs.length} records`}
            </p>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              {canManage
                ? "No maintenance records yet. Log the first one above."
                : "No maintenance records yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[720px] divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">Asset</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 md:table-cell md:px-6 dark:text-zinc-400">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">Title</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 lg:table-cell lg:px-6 dark:text-zinc-400">Action Taken</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 xl:table-cell xl:px-6 dark:text-zinc-400">Performed By</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 md:table-cell md:px-6 dark:text-zinc-400">Cost</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">Outcome</th>
                    {canDelete && (
                      <th className="px-4 py-3 text-right font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {logs.map((log) => (
                    <tr key={log.id} className="align-top hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-600 sm:px-6 dark:text-zinc-400">
                        {formatDate(log.log_date)}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        <span className="font-medium">{log.assets.name}</span>
                        <span className="block text-xs text-zinc-500">
                          {TYPE_LABELS[log.assets.type]}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-zinc-600 md:table-cell md:px-6 dark:text-zinc-400">
                        {MAINTENANCE_TYPE_LABELS[log.maintenance_type]}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        <span className="font-medium">{log.title}</span>
                        {log.description && (
                          <span className="block text-xs text-zinc-500">
                            {log.description}
                          </span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-zinc-600 lg:table-cell lg:px-6 dark:text-zinc-400">
                        {log.action_taken || "—"}
                      </td>
                      <td className="hidden px-4 py-3 text-zinc-600 xl:table-cell xl:px-6 dark:text-zinc-400">
                        {log.performed_by || "—"}
                      </td>
                      <td className="hidden px-4 py-3 text-zinc-600 md:table-cell md:px-6 dark:text-zinc-400">
                        {log.cost != null ? `ETB ${Number(log.cost).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${OUTCOME_STYLES[log.outcome]}`}
                        >
                          {log.outcome}
                        </span>
                      </td>
                      {canDelete && (
                        <td className="px-4 py-3 sm:px-6">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => setDeleting(log)}
                              className="text-sm font-medium text-zinc-400 transition-colors hover:text-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}