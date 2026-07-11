import {
  createDefaultScreenRootLayout,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { z } from "zod";

import {
  tenantSidebarLayoutRecordSchema,
  type PutTenantSidebarLayoutInput,
  type TenantSidebarLayoutRecord,
} from "./sidebar-layout-types.js";

/** Empty screen-root layout used when header/footer JSON is missing (legacy reads). */
export function createEmptyScreenLayout(): UiLayoutDocument {
  return createDefaultScreenRootLayout();
}

const emptyScreenLayoutJson = (): string =>
  JSON.stringify(createEmptyScreenLayout());

export const persistedTenantSidebarLayoutSchema = z
  .object({
    tenantId: z.string().trim().min(1),
    updatedAt: z.string().datetime(),
    sidebarLayoutJson: z.string().min(2),
    headerLayoutJson: z
      .string()
      .min(2)
      .optional()
      .default(emptyScreenLayoutJson),
    footerLayoutJson: z
      .string()
      .min(2)
      .optional()
      .default(emptyScreenLayoutJson),
    settingsJson: z.string().min(2),
  })
  .strict();

export type PersistedTenantSidebarLayout = z.infer<
  typeof persistedTenantSidebarLayoutSchema
>;

function parseJsonField<T>(json: string, fieldName: string): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    throw new Error(
      `Invalid JSON in persisted tenant sidebar layout field "${fieldName}".`,
    );
  }
}

export function toPersistedTenantSidebarLayout(
  record: TenantSidebarLayoutRecord,
): PersistedTenantSidebarLayout {
  return persistedTenantSidebarLayoutSchema.parse({
    tenantId: record.tenantId,
    updatedAt: record.updatedAt,
    sidebarLayoutJson: JSON.stringify(record.sidebarLayout),
    headerLayoutJson: JSON.stringify(record.headerLayout),
    footerLayoutJson: JSON.stringify(record.footerLayout),
    settingsJson: JSON.stringify(record.settings),
  });
}

function toDomainRecord(
  data: PersistedTenantSidebarLayout,
): TenantSidebarLayoutRecord {
  return tenantSidebarLayoutRecordSchema.parse({
    tenantId: data.tenantId,
    updatedAt: data.updatedAt,
    sidebarLayout: parseJsonField(data.sidebarLayoutJson, "sidebarLayoutJson"),
    headerLayout: parseJsonField(data.headerLayoutJson, "headerLayoutJson"),
    footerLayout: parseJsonField(data.footerLayoutJson, "footerLayoutJson"),
    settings: parseJsonField(data.settingsJson, "settingsJson"),
  }) as TenantSidebarLayoutRecord;
}

export function fromPersistedTenantSidebarLayout(
  data: unknown,
): TenantSidebarLayoutRecord {
  const persisted = persistedTenantSidebarLayoutSchema.parse(data);
  return toDomainRecord(persisted);
}

export function safeFromPersistedTenantSidebarLayout(
  data: unknown,
): TenantSidebarLayoutRecord | null {
  const persisted = persistedTenantSidebarLayoutSchema.safeParse(data);
  if (!persisted.success) {
    return null;
  }

  try {
    return toDomainRecord(persisted.data);
  } catch {
    return null;
  }
}

export function parseTenantSidebarLayoutRecord(
  tenantId: string,
  input: PutTenantSidebarLayoutInput,
): TenantSidebarLayoutRecord {
  return tenantSidebarLayoutRecordSchema.parse({
    tenantId,
    sidebarLayout: input.sidebarLayout,
    headerLayout: input.headerLayout,
    footerLayout: input.footerLayout,
    settings: input.settings,
    updatedAt: new Date().toISOString(),
  }) as TenantSidebarLayoutRecord;
}
