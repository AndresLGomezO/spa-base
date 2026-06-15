import { z } from "zod";

import {
  tenantDashboardLayoutRecordSchema,
  type PutTenantDashboardLayoutInput,
  type TenantDashboardLayoutRecord,
} from "./dashboard-layout-types.js";

export const persistedTenantDashboardLayoutSchema = z
  .object({
    tenantId: z.string().trim().min(1),
    updatedAt: z.string().datetime(),
    dashboardSectionsJson: z.string().min(2),
    dashboardLayoutJson: z.string().min(2),
  })
  .strict();

export type PersistedTenantDashboardLayout = z.infer<
  typeof persistedTenantDashboardLayoutSchema
>;

function parseJsonField<T>(json: string, fieldName: string): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    throw new Error(
      `Invalid JSON in persisted tenant dashboard layout field "${fieldName}".`,
    );
  }
}

export function toPersistedTenantDashboardLayout(
  record: TenantDashboardLayoutRecord,
): PersistedTenantDashboardLayout {
  return persistedTenantDashboardLayoutSchema.parse({
    tenantId: record.tenantId,
    updatedAt: record.updatedAt,
    dashboardSectionsJson: JSON.stringify(record.dashboardSections),
    dashboardLayoutJson: JSON.stringify(record.dashboardLayout),
  });
}

function toDomainRecord(
  data: PersistedTenantDashboardLayout,
): TenantDashboardLayoutRecord {
  return tenantDashboardLayoutRecordSchema.parse({
    tenantId: data.tenantId,
    updatedAt: data.updatedAt,
    dashboardSections: parseJsonField(
      data.dashboardSectionsJson,
      "dashboardSectionsJson",
    ),
    dashboardLayout: parseJsonField(
      data.dashboardLayoutJson,
      "dashboardLayoutJson",
    ),
  }) as TenantDashboardLayoutRecord;
}

export function fromPersistedTenantDashboardLayout(
  data: unknown,
): TenantDashboardLayoutRecord {
  const persisted = persistedTenantDashboardLayoutSchema.parse(data);
  return toDomainRecord(persisted);
}

export function safeFromPersistedTenantDashboardLayout(
  data: unknown,
): TenantDashboardLayoutRecord | null {
  const persisted = persistedTenantDashboardLayoutSchema.safeParse(data);
  if (!persisted.success) {
    return null;
  }

  try {
    return toDomainRecord(persisted.data);
  } catch {
    return null;
  }
}

export function parseTenantDashboardLayoutRecord(
  tenantId: string,
  input: PutTenantDashboardLayoutInput,
): TenantDashboardLayoutRecord {
  return tenantDashboardLayoutRecordSchema.parse({
    tenantId,
    dashboardSections: input.dashboardSections,
    dashboardLayout: input.dashboardLayout,
    updatedAt: new Date().toISOString(),
  }) as TenantDashboardLayoutRecord;
}
