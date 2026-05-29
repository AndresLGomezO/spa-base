/**
 * System fields auto-injected into every entity full schema.
 * Must not appear in developer field configs (enforced by AssertNoSystemFields).
 *
 * tenantId is excluded from createSchema — API middleware injects it server-side.
 */
export const SYSTEM_FIELD_KEYS = [
  "id",
  "tenantId",
  "createdAt",
  "updatedAt",
] as const;

export type SystemFieldKey = (typeof SYSTEM_FIELD_KEYS)[number];

export const SYSTEM_FIELDS = {
  id: {
    type: "string" as const,
    required: true,
    system: true,
  },
  tenantId: {
    type: "string" as const,
    required: true,
    system: true,
  },
  createdAt: {
    type: "date" as const,
    required: true,
    system: true,
  },
  updatedAt: {
    type: "date" as const,
    required: true,
    system: true,
  },
} as const;

export interface SystemFieldRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
