import { z } from "zod";

export const ASSET_TYPES = ["switch", "router", "patch_panel"] as const;
export const ASSET_STATUSES = [
  "active",
  "maintenance",
  "offline",
  "decommissioned",
] as const;
export const PORT_TYPES = ["RJ45", "SFP", "SFP+", "Fiber"] as const;
export const CABLE_TYPES = [
  "Cat5e",
  "Cat6",
  "Cat6a",
  "Cat7",
  "Fiber SM",
  "Fiber MM",
] as const;
export const CABLE_STATUSES = ["active", "planned", "decommissioned"] as const;
export const MAINTENANCE_TYPES = [
  "preventive",
  "corrective",
  "inspection",
] as const;
export const MAINTENANCE_OUTCOMES = ["pending", "completed", "failed"] as const;
export const ROLES = ["admin", "technician", "viewer"] as const;

function isValidIPv4(value: string | null | undefined): boolean {
  if (!value) return true;
  const octets = value.split(".");
  if (octets.length !== 4) return false;
  return octets.every((octet) => {
    if (!/^\d{1,3}$/.test(octet)) return false;
    const n = Number(octet);
    return n >= 0 && n <= 255;
  });
}

/** Converts a ZodError to a single human-readable message. */
export function zodMessage(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const field = issue.path.length ? `${issue.path.join(".")}: ` : "";
      return `${field}${issue.message}`;
    })
    .join("; ");
}

export const assetSchema = z.object({
  name: z.string().trim().min(1, "Asset name is required").max(120),
  asset_tag: z.string().trim().max(60).nullable().optional(),
  type: z.enum(ASSET_TYPES),
  status: z.enum(ASSET_STATUSES),
  location: z.string().trim().max(200).nullable().optional(),
  ip_address: z
    .string()
    .trim()
    .max(64, "IP address cannot exceed 64 characters")
    .nullable()
    .optional()
    .transform((v) => v || null)
    .refine(isValidIPv4, {
      message: "IP address must be a valid IPv4 address (e.g. 192.168.1.1)",
    }),
});

export const portSchema = z.object({
  asset_id: z.string().uuid("Select a valid asset"),
  port_number: z.string().trim().min(1, "Port number is required").max(20),
  port_type: z.enum(PORT_TYPES),
});

export const cableSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(160),
  cable_type: z.enum(CABLE_TYPES),
  length_m: z
    .number("Length must be a number")
    .min(0, "Length cannot be negative")
    .max(999999.99)
    .nullable()
    .optional(),
  endpoint_a_port_id: z.string().uuid("Select endpoint A port"),
  endpoint_b_port_id: z.string().uuid("Select endpoint B port"),
});

export const maintenanceLogSchema = z.object({
  asset_id: z.string().uuid("Select a valid asset"),
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"),
  maintenance_type: z.enum(MAINTENANCE_TYPES),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  action_taken: z.string().trim().max(2000).nullable().optional(),
  performed_by: z.string().trim().max(120).nullable().optional(),
  cost: z
    .number("Cost must be a number")
    .min(0, "Cost cannot be negative")
    .max(999999999.99)
    .nullable()
    .optional(),
  outcome: z.enum(MAINTENANCE_OUTCOMES),
});

export const roleSchema = z.object({
  role: z.enum(ROLES),
});

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .max(72, "Password cannot exceed 72 characters"),
});

export const signupSchema = z
  .object({
    display_name: z
      .string()
      .trim()
      .max(80, "Display name cannot exceed 80 characters")
      .optional()
      .transform((v) => v || null),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters long")
      .max(72, "Password cannot exceed 72 characters"),
    confirm: z.string().min(1, "Please confirm your password"),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

export const passwordResetSchema = z
  .object({
    password: z
      .string()
      .min(6, "Password must be at least 6 characters long")
      .max(72, "Password cannot exceed 72 characters"),
    confirm: z.string().min(1, "Please confirm your password"),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });