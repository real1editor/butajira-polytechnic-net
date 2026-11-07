"use client";

/**
 * Minimal, dependency-free Code 39 barcode renderer.
 *
 * Code 39 is intentionally chosen for asset labels: it is self-checking,
 * readable by virtually every handheld scanner, and only needs 43 glyphs.
 * Each glyph is nine alternating bar/space elements (three wide, six narrow)
 * encoded below as 12 modules (narrow = 1, wide = 2).
 */
const CODE39: Record<string, string> = {
  "0": "101001101101",
  "1": "110100101011",
  "2": "101100101011",
  "3": "110110010101",
  "4": "101001101011",
  "5": "110100110101",
  "6": "101100110101",
  "7": "101001011011",
  "8": "110100101101",
  "9": "101100101101",
  A: "110101001011",
  B: "101101001011",
  C: "110110100101",
  D: "101011001011",
  E: "110101100101",
  F: "101101100101",
  G: "101010011011",
  H: "110101001101",
  I: "101101001101",
  J: "101011001101",
  K: "110101010011",
  L: "101101010011",
  M: "110110101001",
  N: "101011010011",
  O: "110101101001",
  P: "101101101001",
  Q: "101010110011",
  R: "110101011001",
  S: "101101011001",
  T: "101011011001",
  U: "110010101011",
  V: "100110101011",
  W: "110011010101",
  X: "100101101011",
  Y: "110010110101",
  Z: "100110110101",
  "-": "100101011011",
  ".": "110010101101",
  " ": "100110101101",
  $: "100100100101",
  "/": "100100101001",
  "+": "100101001001",
  "%": "101001001001",
  "*": "100101101101",
};

const INVALID = /[^0-9A-Z\-. $/+%]/g;

export default function Barcode({
  value,
  height = 56,
  moduleWidth = 2,
  showValue = true,
}: {
  value: string;
  height?: number;
  moduleWidth?: number;
  showValue?: boolean;
}) {
  const clean = (value || "ASSET").toUpperCase().replace(INVALID, "-").slice(0, 24);
  const sequence = `*${clean}*`;

  const bars: { x: number; width: number }[] = [];
  let cursor = 0;

  for (const char of sequence) {
    const pattern = CODE39[char] ?? CODE39["-"];
    for (let index = 0; index < pattern.length; index += 1) {
      if (pattern[index] === "1") {
        bars.push({ x: cursor + index, width: 1 });
      }
    }
    cursor += pattern.length;
    // Narrow inter-character gap (one module).
    cursor += 1;
  }

  const totalModules = cursor;
  const svgWidth = totalModules * moduleWidth;

  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <svg
        width={svgWidth}
        height={height}
        viewBox={`0 0 ${totalModules} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Barcode for ${clean}`}
        className="max-w-full"
      >
        {bars.map((bar, index) => (
          <rect
            key={index}
            x={bar.x}
            y={0}
            width={bar.width}
            height={height}
            fill="#111111"
            shapeRendering="crispEdges"
          />
        ))}
      </svg>
      {showValue && (
        <span className="font-mono text-[11px] font-semibold tracking-[0.18em] text-zinc-700 dark:text-zinc-300">
          {clean}
        </span>
      )}
    </div>
  );
}
