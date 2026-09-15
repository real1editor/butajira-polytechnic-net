"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  Asset,
  AssetStatus,
  AssetType,
  Stats,
  STATUS_STYLES,
  TYPE_LABELS,
  fetchAssets,
  fetchStats,
  insertAsset,
} from "@/lib/queries";

const INITIAL_FORM = {
  name: "",
  asset_tag: "",
  type: "switch" as AssetType,
  location: "",
  ip_address: "",
  status: "active" as AssetStatus,
};

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none";

type StatCard = {
  label: string;
  value: number;
  tint: string;
};

export default function Home() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);

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

  function handleChange(field: keyof typeof INITIAL_FORM, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
    setSaving(false);
  }

  const statCards: StatCard[] = [
    { label: "Total Assets", value: stats?.assets ?? 0, tint: "bg-zinc-900" },
    { label: "Active Assets", value: stats?.activeAssets ?? 0, tint: "bg-green-500" },
    { label: "Total Ports", value: stats?.ports ?? 0, tint: "bg-blue-500" },
    { label: "Active Cables", value: stats?.activeCables ?? 0, tint: "bg-amber-500" },
    { label: "Maintenance Logs", value: stats?.maintenanceLogs ?? 0, tint: "bg-red-500" },
  ];

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans text-zinc-900">
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Butajira Polytechnic College
          </h1>
          <p className="mt-1 text-zinc-600">
            Network Asset & Cable Infrastructure Management Dashboard
          </p>
        </header>

        <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className={`mb-3 h-1.5 w-8 rounded-full ${card.tint}`} />
              <p className="text-2xl font-semibold">{card.value}</p>
              <p className="mt-0.5 text-sm text-zinc-500">{card.label}</p>
            </div>
          ))}
        </section>

        <section className="mb-8 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium">Add Asset</h2>
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <label className="flex flex-col gap-1.5 text-sm font-medium">
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

            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Asset Tag
              <input
                type="text"
                value={form.asset_tag}
                onChange={(e) => handleChange("asset_tag", e.target.value)}
                placeholder="e.g. BPC-CS-001 (auto if blank)"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium">
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

            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Location
              <input
                type="text"
                value={form.location}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="e.g. Server Room Rack A"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium">
              IP Address
              <input
                type="text"
                value={form.ip_address}
                onChange={(e) => handleChange("ip_address", e.target.value)}
                placeholder="e.g. 192.168.1.1"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium">
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

            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-md bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {saving ? "Adding..." : "Add Asset"}
              </button>
            </div>
          </form>
        </section>

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-medium">Registered Assets</h2>
              <p className="text-sm text-zinc-600">
                {loading ? "Loading..." : `${assets.length} total`}
              </p>
            </div>
            {!loading && assets.length > 0 && (
              <Link href="/connections" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
                Manage connections →
              </Link>
            )}
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              Loading assets...
            </div>
          ) : assets.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              No assets registered yet. Add your first network asset above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Name</th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Tag</th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Type</th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Location</th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">IP Address</th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-zinc-50">
                      <td className="px-6 py-3 font-medium text-zinc-900">{asset.name}</td>
                      <td className="px-6 py-3 font-mono text-xs text-zinc-500">
                        {asset.asset_tag || "—"}
                      </td>
                      <td className="px-6 py-3 text-zinc-600">{TYPE_LABELS[asset.type]}</td>
                      <td className="px-6 py-3 text-zinc-600">{asset.location || "—"}</td>
                      <td className="px-6 py-3 font-mono text-zinc-600">
                        {asset.ip_address || "—"}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[asset.status]}`}
                        >
                          {asset.status}
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