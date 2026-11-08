import { ImageResponse } from "next/og";

export const alt =
  "BPC Network Management — Network Operations Center for Butajira Polytechnic College";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background:
            "radial-gradient(900px 500px at 12% 0%, rgba(16,185,129,0.22), transparent 62%), radial-gradient(800px 480px at 95% 8%, rgba(34,211,238,0.26), transparent 60%), #05070a",
          color: "#e6edf3",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 76,
              height: 76,
              borderRadius: 22,
              border: "1px solid rgba(34,211,238,0.45)",
              background:
                "linear-gradient(135deg, rgba(94,234,212,0.28), rgba(34,211,238,0.12))",
              color: "#a5f3fc",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            BPC
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: 0.5 }}>
              Butajira Polytechnic College
            </span>
            <span style={{ fontSize: 18, color: "#94a3b8" }}>
              Network Operations Center
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <span
            style={{
              fontSize: 68,
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: -2,
              maxWidth: 940,
            }}
          >
            Network asset & cable infrastructure management
          </span>
          <span style={{ fontSize: 26, color: "#94a3b8", maxWidth: 900 }}>
            Assets, ports, patching, maintenance, topology and immutable audit
            trails in one secure console.
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {["Role-based access", "Live topology", "Audit trail", "Realtime"].map(
            (label) => (
              <span
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.28)",
                  background: "rgba(255,255,255,0.05)",
                  padding: "10px 18px",
                  fontSize: 18,
                  color: "#cbd5e1",
                }}
              >
                {label}
              </span>
            )
          )}
          <span
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 18,
              color: "#6ee7b7",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: "#34d399",
                boxShadow: "0 0 18px rgba(52,211,153,0.9)",
              }}
            />
            Secure console
          </span>
        </div>
      </div>
    ),
    size
  );
}
