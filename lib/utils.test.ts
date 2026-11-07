import { afterEach, describe, expect, it, vi } from "vitest";
import { formatCurrency, formatDate, todayLocal } from "@/lib/utils";

afterEach(() => {
  vi.useRealTimers();
});

describe("todayLocal", () => {
  it("formats the local calendar date without a UTC shift", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 9, 23, 30));
    expect(todayLocal()).toBe("2026-05-09");
  });
});

describe("formatDate", () => {
  it("formats a plain date without shifting the day", () => {
    expect(formatDate("2026-03-05")).toBe("05 Mar 2026");
  });
});

describe("formatCurrency", () => {
  it("formats Ethiopian Birr", () => {
    expect(formatCurrency(1234.5)).toBe("ETB 1,234.5");
    expect(formatCurrency(1000000)).toBe("ETB 1,000,000");
  });

  it("returns a dash for missing or invalid values", () => {
    expect(formatCurrency(null)).toBe("—");
    expect(formatCurrency(undefined)).toBe("—");
    expect(formatCurrency(Number.NaN)).toBe("—");
  });
});
