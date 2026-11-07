import type { Asset, CableJoined, MaintenanceJoined } from "@/lib/queries";
import {
  CABLE_TYPE_LABELS,
  MAINTENANCE_TYPE_LABELS,
  TYPE_LABELS,
} from "@/lib/queries";
import { formatDate, todayLocal } from "@/lib/utils";

export type CsvValue = string | number | boolean | null | undefined;

function escapeCell(value: CsvValue): string {
  if (value == null) return "";
  let text = String(value);
  // Neutralize spreadsheet formula injection for user-controlled strings.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Triggers a browser download of a UTF-8 CSV (Excel friendly BOM included). */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: CsvValue[][]
): void {
  if (typeof window === "undefined") return;

  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));
  const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

const stamp = () => todayLocal();

export function exportAssetsCsv(assets: Asset[]): void {
  downloadCsv(
    `bpc-assets-${stamp()}.csv`,
    ["Name", "Asset tag", "Type", "Status", "Location", "IP address", "Created"],
    assets.map((asset) => [
      asset.name,
      asset.asset_tag,
      TYPE_LABELS[asset.type],
      asset.status,
      asset.location,
      asset.ip_address,
      formatDate(asset.created_at.slice(0, 10)),
    ])
  );
}

export function exportCablesCsv(cables: CableJoined[]): void {
  downloadCsv(
    `bpc-cables-${stamp()}.csv`,
    [
      "Label",
      "Cable type",
      "Length (m)",
      "Status",
      "Endpoint A asset",
      "Endpoint A port",
      "Endpoint B asset",
      "Endpoint B port",
    ],
    cables.map((cable) => [
      cable.label,
      CABLE_TYPE_LABELS[cable.cable_type],
      cable.length_m,
      cable.status,
      cable.endpoint_a.assets.name,
      cable.endpoint_a.port_number,
      cable.endpoint_b.assets.name,
      cable.endpoint_b.port_number,
    ])
  );
}

export function exportMaintenanceCsv(logs: MaintenanceJoined[]): void {
  downloadCsv(
    `bpc-maintenance-${stamp()}.csv`,
    [
      "Date",
      "Asset",
      "Type",
      "Title",
      "Outcome",
      "Performed by",
      "Cost (ETB)",
      "Action taken",
    ],
    logs.map((log) => [
      log.log_date,
      log.assets.name,
      MAINTENANCE_TYPE_LABELS[log.maintenance_type],
      log.title,
      log.outcome,
      log.performed_by,
      log.cost,
      log.action_taken,
    ])
  );
}
