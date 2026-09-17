"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Asset,
  CableJoined,
  CableStatus,
  CableType,
  CABLE_STATUS_STYLES,
  CABLE_TYPE_LABELS,
  PortJoined,
  PortType,
  TYPE_LABELS,
  fetchAssets,
  fetchCables,
  fetchPorts,
  insertCable,
  insertPort,
  updateCableStatus,
} from "@/lib/queries";
import { usePermissions } from "@/app/contexts/AuthContext";
import { useToast } from "@/app/contexts/ToastContext";
import ProtectRole, { ReadOnlyNotice } from "@/app/components/ProtectRole";
import ConfirmDialog from "@/app/components/ConfirmDialog";

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-700";

const comparePorts = (a: PortJoined, b: PortJoined) => {
  const nameDiff = a.assets.name.localeCompare(b.assets.name);
  if (nameDiff !== 0) return nameDiff;
  const an = parseInt(a.port_number, 10);
  const bn = parseInt(b.port_number, 10);
  if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
  return a.port_number.localeCompare(b.port_number);
};

export default function ConnectionsPage() {
  const { canManage, canDelete } = usePermissions();
  const { success } = useToast();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [ports, setPorts] = useState<PortJoined[]>([]);
  const [cables, setCables] = useState<CableJoined[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<CableJoined | null>(null);

  const [form, setForm] = useState({
    assetA: "",
    portA: "",
    assetB: "",
    portB: "",
    label: "",
    cable_type: "Cat6" as CableType,
    length_m: "",
  });

  const [portForm, setPortForm] = useState({
    asset_id: "",
    port_number: "",
    port_type: "RJ45" as PortType,
  });

  useEffect(() => {
    Promise.all([fetchAssets(), fetchPorts(), fetchCables()]).then(
      ([assetRes, portRes, cableRes]) => {
        if (assetRes.error) setError(assetRes.error);
        else setAssets(assetRes.data ?? []);

        if (portRes.error) setError(portRes.error);
        else setPorts(portRes.data ?? []);

        if (cableRes.error) setError(cableRes.error);
        else setCables(cableRes.data ?? []);

        setLoading(false);
      }
    );
  }, []);

  const usedPortIds = useMemo(
    () =>
      new Set(
        cables
          .filter((c) => c.status !== "decommissioned")
          .flatMap((c) => [c.endpoint_a_port_id, c.endpoint_b_port_id])
      ),
    [cables]
  );

  const freePorts = useMemo(
    () => ports.filter((p) => !usedPortIds.has(p.id)),
    [ports, usedPortIds]
  );

  const portsOfA = useMemo(
    () => freePorts.filter((p) => p.asset_id === form.assetA),
    [freePorts, form.assetA]
  );
  const portsOfB = useMemo(
    () => freePorts.filter((p) => p.asset_id === form.assetB && p.id !== form.portA),
    [freePorts, form.assetB, form.portA]
  );

  const selectedPortA = ports.find((p) => p.id === form.portA);
  const selectedPortB = ports.find((p) => p.id === form.portB);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePortChange(field: keyof typeof portForm, value: string) {
    setPortForm((prev) => ({ ...prev, [field]: value }));
  }

  async function refreshData() {
    const [assetRes, portRes, cableRes] = await Promise.all([
      fetchAssets(),
      fetchPorts(),
      fetchCables(),
    ]);
    if (assetRes.error) setError(assetRes.error);
    else setAssets(assetRes.data ?? []);
    if (portRes.error) setError(portRes.error);
    else setPorts(portRes.data ?? []);
    if (cableRes.error) setError(cableRes.error);
    else setCables(cableRes.data ?? []);
  }

  async function handleAddCable(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.portA || !form.portB) return;
    setSaving(true);
    setError(null);

    const autoLabel =
      selectedPortA && selectedPortB
        ? `${selectedPortA.assets.name}-${selectedPortA.port_number} → ${selectedPortB.assets.name}-${selectedPortB.port_number}`
        : "Untitled cable";

    const label = form.label.trim() || autoLabel;

    const insertError = await insertCable({
      label,
      cable_type: form.cable_type,
      length_m: form.length_m ? Number(form.length_m) : null,
      endpoint_a_port_id: form.portA,
      endpoint_b_port_id: form.portB,
    });

    if (insertError) {
      setError(insertError);
      setSaving(false);
      return;
    }

    setForm({
      assetA: "",
      portA: "",
      assetB: "",
      portB: "",
      label: "",
      cable_type: "Cat6",
      length_m: "",
    });
    success("Cable connected successfully.");
    setSaving(false);
    refreshData();
  }

  function handleStatusChange(cable: CableJoined) {
    const nextStatus: CableStatus = cable.status === "active" ? "planned" : "active";
    updateCableStatus(cable.id, nextStatus).then((err) => {
      if (err) setError(err);
      else {
        success(`Cable marked as ${nextStatus}.`);
        refreshData();
      }
    });
  }

  function confirmDecommission(cable: CableJoined) {
    setConfirmTarget(cable);
  }

  async function handleDecommission() {
    if (!confirmTarget) return;
    setSaving(true);
    setError(null);
    const updateError = await updateCableStatus(confirmTarget.id, "decommissioned");
    if (updateError) setError(updateError);
    else {
      success("Cable decommissioned.");
      refreshData();
    }
    setConfirmTarget(null);
    setSaving(false);
  }

  async function handleAddPort(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!portForm.asset_id || !portForm.port_number.trim()) return;
    setError(null);
    const insertError = await insertPort(
      portForm.asset_id,
      portForm.port_number,
      portForm.port_type
    );
    if (insertError) setError(insertError);
    else {
      setPortForm({ asset_id: "", port_number: "", port_type: "RJ45" });
      success("Port added.");
      refreshData();
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {confirmTarget && (
        <ConfirmDialog
          open={!!confirmTarget}
          title="Decommission cable"
          message={`Mark "${confirmTarget.label}" as decommissioned? This frees both ports.`}
          confirmLabel="Decommission"
          busy={saving}
          onConfirm={handleDecommission}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Connections & Port Mapping
          </h1>
          <p className="mt-1 text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
            Patch cables between device ports, and manage port assignments
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
            <ReadOnlyNotice message="Connections are shown in read-only mode. Contact an administrator to add or edit cables and ports." />
          }
        >
          <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:mb-8 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-1 text-lg font-medium">New Connection</h2>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Select the two endpoints (device + port) to link with a cable.
            </p>
            <form
              onSubmit={handleAddCable}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Endpoint A — Asset
                <select
                  value={form.assetA}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, assetA: e.target.value, portA: "" }))
                  }
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
                Endpoint A — Port
                <select
                  value={form.portA}
                  onChange={(e) => handleChange("portA", e.target.value)}
                  disabled={!form.assetA}
                  className={inputClass}
                >
                  <option value="">
                    {!form.assetA ? "Select asset first" : portsOfA.length ? "Select free port..." : "No free ports"}
                  </option>
                  {portsOfA.map((port) => (
                    <option key={port.id} value={port.id}>
                      Port {port.port_number} ({port.port_type})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Endpoint B — Asset
                <select
                  value={form.assetB}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, assetB: e.target.value, portB: "" }))
                  }
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
                Endpoint B — Port
                <select
                  value={form.portB}
                  onChange={(e) => handleChange("portB", e.target.value)}
                  disabled={!form.assetB}
                  className={inputClass}
                >
                  <option value="">
                    {!form.assetB ? "Select asset first" : portsOfB.length ? "Select free port..." : "No free ports"}
                  </option>
                  {portsOfB.map((port) => (
                    <option key={port.id} value={port.id}>
                      Port {port.port_number} ({port.port_type})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Label
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => handleChange("label", e.target.value)}
                  placeholder="Auto-generated if blank"
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Cable Type
                <select
                  value={form.cable_type}
                  onChange={(e) => handleChange("cable_type", e.target.value)}
                  className={inputClass}
                >
                  {Object.entries(CABLE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Length (m)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.length_m}
                  onChange={(e) => handleChange("length_m", e.target.value)}
                  placeholder="e.g. 3.5"
                  className={inputClass}
                />
              </label>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={saving || !form.portA || !form.portB}
                  className="w-full rounded-md bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {saving ? "Connecting..." : "Connect"}
                </button>
              </div>
            </form>
          </section>
        </ProtectRole>

        <section className="mb-6 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm sm:mb-8 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-4 py-4 sm:px-6 dark:border-zinc-800">
            <h2 className="text-lg font-medium">Registered Cables</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {loading ? "Loading..." : `${cables.length} total`}
            </p>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              Loading connections...
            </div>
          ) : cables.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              {canManage
                ? "No cables registered yet. Link two free ports above."
                : "No cables registered yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[640px] divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">Label</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 sm:table-cell sm:px-6 dark:text-zinc-400">Type</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 sm:table-cell sm:px-6 dark:text-zinc-400">Length</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">Endpoint A</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">Endpoint B</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">Status</th>
                    {canManage && (
                      <th className="px-4 py-3 text-right font-medium text-zinc-500 sm:px-6 dark:text-zinc-400">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {[...cables]
                    .sort((a, b) => comparePorts(a.endpoint_a, b.endpoint_a))
                    .map((cable) => (
                      <tr key={cable.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="px-4 py-3 font-medium sm:px-6">
                          {cable.label}
                        </td>
                        <td className="hidden px-4 py-3 text-zinc-600 sm:table-cell sm:px-6 dark:text-zinc-400">
                          {CABLE_TYPE_LABELS[cable.cable_type]}
                        </td>
                        <td className="hidden px-4 py-3 text-zinc-600 sm:table-cell sm:px-6 dark:text-zinc-400">
                          {cable.length_m != null ? `${cable.length_m} m` : "—"}
                        </td>
                        <td className="px-4 py-3 sm:px-6">
                          <span className="block font-medium">
                            {cable.endpoint_a.assets.name}
                          </span>
                          <span className="font-mono text-xs text-zinc-500">
                            P{cable.endpoint_a.port_number}
                          </span>
                        </td>
                        <td className="px-4 py-3 sm:px-6">
                          <span className="block font-medium">
                            {cable.endpoint_b.assets.name}
                          </span>
                          <span className="font-mono text-xs text-zinc-500">
                            P{cable.endpoint_b.port_number}
                          </span>
                        </td>
                        <td className="px-4 py-3 sm:px-6">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${CABLE_STATUS_STYLES[cable.status]}`}
                          >
                            {cable.status}
                          </span>
                        </td>
                        {canManage && (
                          <td className="px-4 py-3 sm:px-6">
                            <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                              {cable.status !== "decommissioned" && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(cable)}
                                  className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-white"
                                >
                                  {cable.status === "active" ? "Mark planned" : "Mark active"}
                                </button>
                              )}
                              {cable.status === "active" && canDelete && (
                                <button
                                  type="button"
                                  onClick={() => confirmDecommission(cable)}
                                  className="text-sm font-medium text-zinc-400 transition-colors hover:text-red-600"
                                >
                                  Decommission
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

        <ProtectRole
          allowedRoles={["admin", "technician"]}
          fallback={
            <ReadOnlyNotice message="Port management is restricted to administrators and technicians." />
          }
        >
          <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-1 text-lg font-medium">Add a Port</h2>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Ports are generated automatically for new switches (24), patch
              panels (48), and routers (WAN/LAN). Add extras manually if needed.
            </p>
            <form
              onSubmit={handleAddPort}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Asset
                <select
                  value={portForm.asset_id}
                  onChange={(e) => handlePortChange("asset_id", e.target.value)}
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
                Port Number
                <input
                  type="text"
                  value={portForm.port_number}
                  onChange={(e) => handlePortChange("port_number", e.target.value)}
                  placeholder="e.g. 25 or Gi0/1"
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Port Type
                <select
                  value={portForm.port_type}
                  onChange={(e) => handlePortChange("port_type", e.target.value)}
                  className={inputClass}
                >
                  <option value="RJ45">RJ45</option>
                  <option value="SFP">SFP</option>
                  <option value="SFP+">SFP+</option>
                  <option value="Fiber">Fiber</option>
                </select>
              </label>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={!portForm.asset_id || !portForm.port_number.trim()}
                  className="w-full rounded-md border border-zinc-300 bg-white px-6 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                >
                  Add Port
                </button>
              </div>
            </form>
          </section>
        </ProtectRole>
      </main>
    </div>
  );
}