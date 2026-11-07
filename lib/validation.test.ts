import { describe, expect, it } from "vitest";
import {
  assetSchema,
  credentialsSchema,
  maintenanceLogSchema,
  portSchema,
  signupSchema,
  zodMessage,
} from "@/lib/validation";

const validAsset = { name: "Core switch", type: "switch", status: "active" } as const;

describe("assetSchema", () => {
  it("accepts a valid asset", () => {
    expect(assetSchema.safeParse(validAsset).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(assetSchema.safeParse({ ...validAsset, name: "  " }).success).toBe(false);
  });

  it("accepts a valid IPv4 address", () => {
    const result = assetSchema.safeParse({ ...validAsset, ip_address: "192.168.1.10" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid IPv4 address", () => {
    expect(assetSchema.safeParse({ ...validAsset, ip_address: "256.1.1.1" }).success).toBe(
      false
    );
    expect(assetSchema.safeParse({ ...validAsset, ip_address: "1.2.3" }).success).toBe(false);
  });

  it("normalizes a blank IP address to null", () => {
    const result = assetSchema.safeParse({ ...validAsset, ip_address: "  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.ip_address).toBeNull();
  });

  it("allows a blank asset tag", () => {
    expect(assetSchema.safeParse({ ...validAsset, asset_tag: "" }).success).toBe(true);
  });
});

describe("maintenanceLogSchema", () => {
  const valid = {
    asset_id: "11111111-1111-4111-8111-111111111111",
    log_date: "2026-03-05",
    maintenance_type: "corrective",
    title: "Replace fan",
    outcome: "completed",
  } as const;

  it("accepts a valid log", () => {
    expect(maintenanceLogSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects malformed dates", () => {
    expect(
      maintenanceLogSchema.safeParse({ ...valid, log_date: "05-03-2026" }).success
    ).toBe(false);
  });

  it("rejects negative cost", () => {
    expect(maintenanceLogSchema.safeParse({ ...valid, cost: -1 }).success).toBe(false);
  });
});

describe("portSchema", () => {
  it("requires a UUID asset id", () => {
    const result = portSchema.safeParse({
      asset_id: "not-a-uuid",
      port_number: "1",
      port_type: "RJ45",
    });
    expect(result.success).toBe(false);
  });
});

describe("credentialsSchema", () => {
  it("trims and lowercases the email", () => {
    const result = credentialsSchema.parse({ email: "  ADMIN@Example.COM ", password: "secret1" });
    expect(result.email).toBe("admin@example.com");
  });

  it("enforces a minimum password length", () => {
    expect(
      credentialsSchema.safeParse({ email: "a@b.com", password: "123" }).success
    ).toBe(false);
  });
});

describe("signupSchema", () => {
  it("rejects mismatched passwords", () => {
    const result = signupSchema.safeParse({
      email: "a@b.com",
      password: "secret1",
      confirm: "secret2",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["confirm"]);
  });
});

describe("zodMessage", () => {
  it("includes the field path", () => {
    const result = assetSchema.safeParse({ ...validAsset, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(zodMessage(result.error)).toContain("name:");
  });
});
