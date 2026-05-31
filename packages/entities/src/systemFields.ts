/**
 * System fields auto-injected into every entity full schema.
 * Must not appear in developer field configs (enforced by AssertNoSystemFields).
 *
 * tenantId and ownership fields are excluded from createSchema — API middleware injects them server-side.
 */
export const SYSTEM_FIELD_KEYS = [
  "id",
  "tenantId",
  "ownerId",
  "createdBy",
  "updatedBy",
  "accessUserIds",
  "sharedWith",
  "createdAt",
  "updatedAt",
] as const;

export type SystemFieldKey = (typeof SYSTEM_FIELD_KEYS)[number];

export type SharePermission = "read" | "write";

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
  ownerId: {
    type: "string" as const,
    required: true,
    system: true,
  },
  createdBy: {
    type: "string" as const,
    required: true,
    system: true,
  },
  updatedBy: {
    type: "string" as const,
    required: true,
    system: true,
  },
  accessUserIds: {
    type: "string" as const,
    required: true,
    system: true,
  },
  sharedWith: {
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
  readonly ownerId: string;
  readonly createdBy: string;
  readonly updatedBy: string;
  readonly accessUserIds: readonly string[];
  readonly sharedWith: Readonly<Record<string, SharePermission>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Fields the API injects on create; excluded from client createSchema. */
export const SERVER_INJECTED_CREATE_FIELD_KEYS = [
  "id",
  "tenantId",
  "ownerId",
  "createdBy",
  "updatedBy",
  "accessUserIds",
  "sharedWith",
  "createdAt",
  "updatedAt",
] as const;
