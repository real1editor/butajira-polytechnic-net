"use client";

import { useEffect, type CSSProperties } from "react";

const pageStyle: CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "4rem 1rem",
  margin: 0,
  background:
    "radial-gradient(60rem 32rem at 50% -10%, rgba(34,211,238,0.16), transparent 70%), radial-gradient(48rem 28rem at 90% 110%, rgba(16,185,129,0.14), transparent 70%), #05070a",
  color: "#e2e8f0",
  fontFamily:
    "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  WebkitFontSmoothing: "antialiased",
};

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: "26rem",
  padding: "2rem",
  textAlign: "center",
  borderRadius: "1rem",
  border: "1px solid rgba(148,163,184,0.2)",
  background: "rgba(16,23,33,0.82)",
  boxShadow:
    "0 30px 70px -34px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.06)",
  backdropFilter: "blur(26px) saturate(160%)",
};

const buttonStyle: CSSProperties = {
  marginTop: "1.5rem",
  padding: "0.55rem 1.1rem",
  borderRadius: "0.65rem",
  border: "1px solid rgba(34,211,238,0.4)",
  background: "rgba(34,211,238,0.16)",
  color: "#67e8f9",
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: "pointer",
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <main style={pageStyle}>
          <div style={cardStyle}>
            <span
              aria-hidden
              style={{
                display: "inline-block",
                height: 10,
                width: 10,
                borderRadius: 9999,
                background: "#f43f5e",
                boxShadow: "0 0 18px rgba(244,63,94,0.8)",
              }}
            />
            <h1
              style={{
                margin: "0.9rem 0 0",
                fontSize: "1.5rem",
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              The console hit an unexpected error
            </h1>
            <p
              style={{
                margin: "0.5rem 0 0",
                fontSize: "0.875rem",
                lineHeight: 1.6,
                color: "#94a3b8",
              }}
            >
              Your session and data are safe. Reload the console to continue.
            </p>
            <button type="button" onClick={reset} style={buttonStyle}>
              Reload console
            </button>
            {error.digest && (
              <p
                style={{
                  margin: "1.5rem 0 0",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                  fontSize: "0.75rem",
                  color: "#64748b",
                }}
              >
                Reference: {error.digest}
              </p>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
