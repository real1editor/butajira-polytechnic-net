"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Asset,
  CableJoined,
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

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none";

const comparePorts = (a: PortJoined, b: PortJoined) => {
  const nameDiff = a.assets.name.localeCompare(b.assets.name);
  if (nameDiff !== 0) return nameDiff;
  const an = parseInt(a.port_number, 10);
  const bn = parseInt(b.port_number, 10);
  if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
  return a.port_number.localeCompare(b.port_number);
};

export default function ConnectionsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [ports, setPorts] = useState<PortJoined[]>([]);
  const [cables, setCables] = useState<CableJoined[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setSaving(false);
    refreshData();
  }

  async function handleDecommission(cable: CableJoined) {
    setError(null);
    const updateError = await updateCableStatus(cable.id, "decommissioned");
    if (updateError) setError(updateError);
    else refreshData();
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
      refreshData();
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans text-zinc-900">
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Connections & Port Mapping
          </h1>
          <p className="mt-1 text-zinc-600">
            Patch cables between device ports, and manage port assignments
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <section className="mb-8 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-medium">New Connection</h2>
          <p className="mb-4 text-sm text-zinc-600">
            Select the two endpoints (device + port) to link with a cable.
          </p>
          <form onSubmit={handleAddCable} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
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

            <label className="flex flex-col gap-1.5 text-sm font-medium">
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

            <label className="flex flex-col gap-1.5 text-sm font-medium">
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

            <label className="flex flex-col gap-1.5 text-sm font-medium">
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

            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Label
              <input
                type="text"
                value={form.label}
                onChange={(e) => handleChange("label", e.target.value)}
                placeholder="Auto-generated if blank"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium">
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

            <label className="flex flex-col gap-1.5 text-sm font-medium">
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
                className="w-full rounded-md bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Connecting..." : "Connect"}
              </button>
            </div>
          </form>
        </section>

        <section className="mb-8 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-6 py-4">
            <h2 className="text-lg font-medium">Registered Cables</h2>
            <p className="text-sm text-zinc-600">
              {loading ? "Loading..." : `${cables.length} total`}
            </p>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              Loading connections...
            </div>
          ) : cables.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              No cables registered yet. Link two free ports above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Label</th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Type</th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Length</th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Endpoint A</th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Endpoint B</th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Status</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {[...cables]
                    .sort((a, b) => comparePorts(a.endpoint_a, b.endpoint_a))
                    .map((cable) => (
                      <tr key={cable.id} className="hover:bg-zinc-50">
                        <td className="px-6 py-3 font-medium text-zinc-900">
                          {cable.label}
                        </td>
                        <td className="px-6 py-3 text-zinc-600">
                          {CABLE_TYPE_LABELS[cable.cable_type]}
                        </td>
                        <td className="px-6 py-3 text-zinc-600">
                          {cable.length_m != null ? `${cable.length_m} m` : "—"}
                        </td>
                        <td className="px-6 py-3 text-zinc-600">
                          <span className="font-medium text-zinc-900">
                            {cable.endpoint_a.assets.name}
                          </span>
                          <span className="font-mono"> · P{cable.endpoint_a.port_number}</span>
                        </td>
                        <td className="px-6 py-3 text-zinc-600">
                          <span className="font-medium text-zinc-900">
                            {cable.endpoint_b.assets.name}
                          </span>
                          <span className="font-mono"> · P{cable.endpoint_b.port_number}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${CABLE_STATUS_STYLES[cable.status]}`}
                          >
                            {cable.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          {cable.status === "active" && (
                            <button
                              type="button"
                              onClick={() => handleDecommission(cable)}
                              className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-900"
                            >
                              Decommission
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-medium">Add a Port</h2>
          <p className="mb-4 text-sm text-zinc-600">
            Ports are generated automatically for new switches (24), patch panels
            (48), and routers (WAN/LAN). Add extras manually if needed.
          </p>
          <form
            onSubmit={handleAddPort}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <label className="flex flex-col gap-1.5 text-sm font-medium">
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

            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Port Number
              <input
                type="text"
                value={portForm.port_number}
                onChange={(e) => handlePortChange("port_number", e.target.value)}
                placeholder="e.g. 25 or Gi0/1"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium">
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
                className="w-full rounded-md border border-zinc-300 bg-white px-6 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add Port
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}