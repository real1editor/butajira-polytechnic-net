"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Asset,
  AssetStatus,
  AssetType,
  Stats,
  STATUS_STYLES,
  TYPE_LABELS,
  deleteAsset,
  fetchAssets,
  fetchStats,
  insertAsset,
  updateAsset,
} from "@/lib/queries";
import { useAuth } from "@/app/contexts/AuthContext";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import Modal from "@/app/components/Modal";
import Toast from "@/app/components/Toast";

const INITIAL_FORM = {
  name: "",
  asset_tag: "",
  type: "switch" as AssetType,
  location: "",
  ip_address: "",
  status: "active" as AssetStatus,
};

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-700";

type StatCard = {
  label: string;
  value: number;
  tint: string;
};

export default function Home() {
  const { profile } = useAuth();
  const role = profile?.role ?? "viewer";
  const canEdit = role === "admin" || role === "technician";
  const canDelete = role === "admin";

  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState<Asset | null>(null);

  useEffect(() => {
    Promise.all([fetchAssets(), fetchStats()]).then(
      ([assetRes, statsRes]) => {
        if (assetRes.error) {
          setError(assetRes.error);
        } else {
          setAssets(assetRes.data ?? []);
        }
        setStats(statsRes);
        setLoading(false);
      }
    );
  }, []);

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) =>
      [a.name, a.asset_tag, a.location, a.ip_address, TYPE_LABELS[a.type]]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [assets, search]);

  function handleChange(field: keyof typeof INITIAL_FORM, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function refreshData() {
    const [assetRes, statsRes] = await Promise.all([
      fetchAssets(),
      fetchStats(),
    ]);
    if (assetRes.error) {
      setError(assetRes.error);
    } else {
      setAssets(assetRes.data ?? []);
    }
    setStats(statsRes);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const insertError = await insertAsset(form);

    if (insertError) {
      setError(insertError);
      setSaving(false);
      return;
    }

    setForm(INITIAL_FORM);
    setToast({ type: "success", message: "Asset added successfully." });
    await refreshData();
    setSaving(false);
  }

  async function handleSaveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError(null);

    const updateError = await updateAsset(editing.id, {
      name: editing.name,
      asset_tag: editing.asset_tag ?? "",
      type: editing.type,
      location: editing.location ?? "",
      ip_address: editing.ip_address ?? "",
      status: editing.status,
    });

    if (updateError) {
      setError(updateError);
      setSaving(false);
      return;
    }

    setEditing(null);
    setToast({ type: "success", message: "Asset updated successfully." });
    await refreshData();
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    setError(null);

    const deleteError = await deleteAsset(deleting.id);
    if (deleteError) {
      setError(deleteError);
      setSaving(false);
      setDeleting(null);
      return;
    }

    setDeleting(null);
    setToast({ type: "success", message: "Asset deleted." });
    await refreshData();
    setSaving(false);
  }

  const statCards: StatCard[] = [
    { label: "Total Assets", value: stats?.assets ?? 0, tint: "bg-zinc-900 dark:bg-zinc-100" },
    { label: "Active Assets", value: stats?.activeAssets ?? 0, tint: "bg-green-500" },
    { label: "Total Ports", value: stats?.ports ?? 0, tint: "bg-blue-500" },
    { label: "Active Cables", value: stats?.activeCables ?? 0, tint: "bg-amber-500" },
    { label: "Maintenance Logs", value: stats?.maintenanceLogs ?? 0, tint: "bg-red-500" },
  ];

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
          title="Delete asset"
          message={`Are you sure you want to delete "${deleting.name}"? This also removes all of its ports, cables, and maintenance logs. This cannot be undone.`}
          confirmLabel="Delete"
          busy={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
      <Modal
        open={!!editing}
        title="Edit Asset"
        onClose={() => setEditing(null)}
      >
        {editing && (
          <form onSubmit={handleSaveEdit} className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Name
              <input
                type="text"
                required
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Asset Tag
              <input
                type="text"
                value={editing.asset_tag ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, asset_tag: e.target.value })
                }
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Type
              <select
                value={editing.type}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    type: e.target.value as AssetType,
                  })
                }
                className={inputClass}
              >
                <option value="switch">Switch</option>
                <option value="router">Router</option>
                <option value="patch_panel">Patch Panel</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Status
              <select
                value={editing.status}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    status: e.target.value as AssetStatus,
                  })
                }
                className={inputClass}
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="offline">Offline</option>
                <option value="decommissioned">Decommissioned</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Location
              <input
                type="text"
                value={editing.location ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, location: e.target.value })
                }
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              IP Address
              <input
                type="text"
                value={editing.ip_address ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, ip_address: e.target.value })
                }
                className={inputClass}
              />
            </label>

            <div className="flex justify-end gap-2 sm:col-span-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={saving}
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Butajira Polytechnic College
          </h1>
          <p className="mt-1 text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
            Network Asset & Cable Infrastructure Management Dashboard
          </p>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className={`mb-3 h-1.5 w-8 rounded-full ${card.tint}`} />
              <p className="text-xl font-semibold sm:text-2xl">{card.value}</p>
              <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">{card.label}</p>
            </div>
          ))}
        </section>

        {canEdit && (
          <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:mb-8 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-medium">Add Asset</h2>
            <form
              onSubmit={handleSubmit}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Name
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g. Core Switch 01"
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Asset Tag
                <input
                  type="text"
                  value={form.asset_tag}
                  onChange={(e) => handleChange("asset_tag", e.target.value)}
                  placeholder="e.g. BPC-CS-001 (auto if blank)"
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Type
                <select
                  value={form.type}
                  onChange={(e) => handleChange("type", e.target.value)}
                  className={inputClass}
                >
                  <option value="switch">Switch</option>
                  <option value="router">Router</option>
                  <option value="patch_panel">Patch Panel</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Location
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  placeholder="e.g. Server Room Rack A"
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                IP Address
                <input
                  type="text"
                  value={form.ip_address}
                  onChange={(e) => handleChange("ip_address", e.target.value)}
                  placeholder="e.g. 192.168.1.1"
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Status
                <select
                  value={form.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className={inputClass}
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="offline">Offline</option>
                  <option value="decommissioned">Decommissioned</option>
                </select>
              </label>

              <div className="flex items-end sm:col-span-2 lg:col-span-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-md bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {saving ? "Adding..." : "Add Asset"}
                </button>
              </div>
            </form>
          </section>
        )}

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
          <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-zinc-800">
            <div>
              <h2 className="text-lg font-medium">Registered Assets</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {loading
                  ? "Loading..."
                  : filteredAssets.length === assets.length
                    ? `${assets.length} total`
                    : `${filteredAssets.length} of ${assets.length}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, tag, IP..."
                className={`${inputClass} w-full sm:w-64`}
              />
              {!loading && assets.length > 0 && (
                <Link
                  href="/connections"
                  className="whitespace-nowrap text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Manage connections →
                </Link>
              )}
            </div>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              Loading assets...
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              {search
                ? "No assets match your search."
                : "No assets registered yet. Add your first network asset above."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[640px] divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">Tag</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 sm:table-cell sm:px-6 dark:text-zinc-400">Type</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 md:table-cell md:px-6 dark:text-zinc-400">Location</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 xl:table-cell xl:px-6 dark:text-zinc-400">IP Address</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">Status</th>
                    {canEdit && (
                      <th className="px-4 py-3 text-right font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-4 py-3 font-medium sm:px-6">{asset.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500 sm:px-6">
                        {asset.asset_tag || "—"}
                      </td>
                      <td className="hidden px-4 py-3 text-zinc-600 sm:table-cell sm:px-6 dark:text-zinc-400">
                        {TYPE_LABELS[asset.type]}
                      </td>
                      <td className="hidden px-4 py-3 text-zinc-600 md:table-cell md:px-6 dark:text-zinc-400">
                        {asset.location || "—"}
                      </td>
                      <td className="hidden px-4 py-3 font-mono text-zinc-600 xl:table-cell xl:px-6 dark:text-zinc-400">
                        {asset.ip_address || "—"}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[asset.status]}`}
                        >
                          {asset.status}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 sm:px-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditing(asset)}
                              className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-white"
                            >
                              Edit
                            </button>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setDeleting(asset)}
                                className="text-sm font-medium text-zinc-400 transition-colors hover:text-red-600"
                              >
                                Delete
                              </button>
                            )}
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