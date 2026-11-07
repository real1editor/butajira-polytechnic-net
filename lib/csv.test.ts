import { describe, expect, it } from "vitest";
import { escapeCell } from "@/lib/csv";

describe("escapeCell", () => {
  it("renders empty cells for nullish values", () => {
    expect(escapeCell(null)).toBe("");
    expect(escapeCell(undefined)).toBe("");
  });

  it("leaves simple text and numbers untouched", () => {
    expect(escapeCell("switch-01")).toBe("switch-01");
    expect(escapeCell(42)).toBe("42");
    expect(escapeCell(true)).toBe("true");
  });

  it("keeps negative numbers numeric (no formula prefix)", () => {
    expect(escapeCell(-5)).toBe("-5");
  });

  it("quotes cells containing commas, quotes or newlines", () => {
    expect(escapeCell("a,b")).toBe('"a,b"');
    expect(escapeCell('He said "hi"')).toBe('"He said ""hi"""');
    expect(escapeCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("neutralizes spreadsheet formula injection in strings", () => {
    expect(escapeCell("=1+1")).toBe("'=1+1");
    expect(escapeCell("+SUM(A1)")).toBe("'+SUM(A1)");
    expect(escapeCell("-2+3")).toBe("'-2+3");
    expect(escapeCell("@cmd")).toBe("'@cmd");
    expect(escapeCell("\tpayload")).toBe("'\tpayload");
  });
});
