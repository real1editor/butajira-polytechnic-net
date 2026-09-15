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
  fetchAssets,
  fetchMaintenanceLogs,
  insertMaintenanceLog,
} from "@/lib/queries";

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none";

const today = () => new Date().toISOString().slice(0, 10);

export default function MaintenancePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [logs, setLogs] = useState<MaintenanceJoined[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setSaving(false);
    refreshData();
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans text-zinc-900">
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Maintenance Logs
          </h1>
          <p className="mt-1 text-zinc-600">
            Preventive, corrective, and inspection history for every asset
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <section className="mb-8 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium">Log Maintenance</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
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

            <label className="flex flex-col gap-1.5 text-sm font-medium">
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

            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Date
              <input
                type="date"
                value={form.log_date}
                onChange={(e) => handleChange("log_date", e.target.value)}
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium">
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

            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Performed By
              <input
                type="text"
                value={form.performed_by}
                onChange={(e) => handleChange("performed_by", e.target.value)}
                placeholder="e.g. IT Technician, vendor"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium">
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

            <label className="flex flex-col gap-1.5 text-sm font-medium">
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

            <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
              Description
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Details of the work performed"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-3">
              Action Taken
              <textarea
                rows={2}
                value={form.action_taken}
                onChange={(e) => handleChange("action_taken", e.target.value)}
                placeholder="What was actually done (auto-fills with 'No action recorded' if blank)"
                className={inputClass}
              />
            </label>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving || !form.asset_id}
                className="w-full rounded-md bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {saving ? "Saving..." : "Add Log"}
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-6 py-4">
            <h2 className="text-lg font-medium">Maintenance History</h2>
            <p className="text-sm text-zinc-600">
              {loading ? "Loading..." : `${logs.length} records`}
            </p>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              No maintenance records yet. Log the first one above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Date</th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Asset</th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Type</th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Title</th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Action Taken</th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Performed By</th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Cost</th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="align-top hover:bg-zinc-50">
                      <td className="px-6 py-3 whitespace-nowrap text-zinc-600">
                        {log.log_date}
                      </td>
                      <td className="px-6 py-3">
                        <span className="font-medium text-zinc-900">
                          {log.assets.name}
                        </span>
                        <span className="block text-xs text-zinc-500">
                          {TYPE_LABELS[log.assets.type]}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-zinc-600 capitalize">
                        {MAINTENANCE_TYPE_LABELS[log.maintenance_type]}
                      </td>
                      <td className="px-6 py-3">
                        <span className="font-medium text-zinc-900">{log.title}</span>
                        {log.description && (
                          <span className="block text-xs text-zinc-500">
                            {log.description}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-zinc-600">
                        {log.action_taken || "—"}
                      </td>
                      <td className="px-6 py-3 text-zinc-600">
                        {log.performed_by || "—"}
                      </td>
                      <td className="px-6 py-3 text-zinc-600">
                        {log.cost != null ? `ETB ${log.cost}` : "—"}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${OUTCOME_STYLES[log.outcome]}`}
                        >
                          {log.outcome}
                        </span>
                      </td>
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