import { describe, expect, it } from "vitest";
import { assetSchema, zodMessage } from "@/lib/validation";
import { toUserMessage, tryCatch } from "@/lib/errors";

describe("toUserMessage", () => {
  it("returns the fallback for nullish input", () => {
    expect(toUserMessage(null)).toBe("Something went wrong. Please try again.");
    expect(toUserMessage(undefined, "Custom fallback")).toBe("Custom fallback");
  });

  it("trims plain strings and falls back when empty", () => {
    expect(toUserMessage("  boom  ")).toBe("boom");
    expect(toUserMessage("   ")).toBe("Something went wrong. Please try again.");
  });

  it("maps RLS and SQL errors to friendly messages", () => {
    expect(
      toUserMessage({ message: 'new row violates row-level security policy for table "assets"' })
    ).toBe("You don't have permission to perform this action.");
    expect(toUserMessage({ message: "duplicate key value violates unique constraint" })).toBe(
      "A record with these details already exists."
    );
    expect(toUserMessage({ message: 'null value in column "name" violates not-null' })).toBe(
      "Some required fields are missing."
    );
    expect(toUserMessage({ message: "fetch failed" })).toBe(
      "A network problem interrupted the request. Check your connection."
    );
  });

  it("returns unmapped SQL messages unchanged", () => {
    expect(toUserMessage({ message: "something unusual" })).toBe("something unusual");
  });

  it("renders Zod errors through zodMessage", () => {
    const result = assetSchema.safeParse({ name: "", type: "switch", status: "active" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toUserMessage(result.error)).toBe(zodMessage(result.error));
    }
  });
});

describe("tryCatch", () => {
  it("returns data on success", async () => {
    await expect(tryCatch(async () => 42)).resolves.toEqual({ data: 42, error: null });
  });

  it("converts thrown errors into a message", async () => {
    const result = await tryCatch(async () => {
      throw new Error("permission denied for table assets");
    });
    expect(result).toEqual({
      data: null,
      error: "You don't have permission to access that data.",
    });
  });
});
