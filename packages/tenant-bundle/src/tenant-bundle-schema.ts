import { entityDefinitionRecordSchema } from "@repo/dynamic-entities";
import { entityCategoryRecordSchema } from "@repo/entity-categories";
import { chartDefinitionRecordSchema } from "@repo/chart-definitions/types";
import { entityQueryDefinitionRecordSchema } from "@repo/entity-queries/types";
import { customViewRecordSchema } from "@repo/custom-views/types";
import {
  entityUiOverrideRecordSchema,
  tenantDashboardLayoutRecordSchema,
  uiBuilderPresetRecordSchema,
} from "@repo/entities";
import { dataHookDefinitionSchema } from "@repo/hooks";
import { formulaDefinitionSchema } from "@repo/formula-definitions/types";
import { metricDefinitionRecordSchema } from "@repo/metrics-engine/types";
import { tenantRoleRecordSchema } from "@repo/rbac";
import { tenantAppearanceSchema } from "@repo/shared-types";
import { z } from "zod";

export const TENANT_BUNDLE_EXPORT_VERSION = 1 as const;

export const tenantBundleExportDocumentSchema = z
  .object({
    version: z.literal(TENANT_BUNDLE_EXPORT_VERSION),
    exportedAt: z.string().datetime(),
    sourceTenantId: z.string().trim().min(1),
    appearance: tenantAppearanceSchema.optional(),
    entityCategories: z.array(entityCategoryRecordSchema),
    entityDefinitions: z.array(entityDefinitionRecordSchema),
    entityUiOverrides: z.array(entityUiOverrideRecordSchema),
    uiBuilderPresets: z.array(uiBuilderPresetRecordSchema),
    tenantDashboardLayout: tenantDashboardLayoutRecordSchema.nullable(),
    roles: z.array(tenantRoleRecordSchema),
    formulaDefinitions: z.array(formulaDefinitionSchema).default([]),
    hooks: z.array(dataHookDefinitionSchema),
    metricDefinitions: z.array(metricDefinitionRecordSchema),
    entityQueryDefinitions: z.array(entityQueryDefinitionRecordSchema),
    chartDefinitions: z.array(chartDefinitionRecordSchema).default([]),
    customViews: z.array(customViewRecordSchema).default([]),
  })
  .strict();

export type TenantBundleExportDocument = z.infer<
  typeof tenantBundleExportDocumentSchema
>;

export interface TenantBundleImportCounts {
  readonly entityCategories: number;
  readonly entityDefinitions: number;
  readonly entityUiOverrides: number;
  readonly uiBuilderPresets: number;
  readonly tenantDashboardLayout: number;
  readonly roles: number;
  readonly formulaDefinitions: number;
  readonly hooks: number;
  readonly metricDefinitions: number;
  readonly entityQueryDefinitions: number;
  readonly chartDefinitions: number;
  readonly customViews: number;
}

export function countTenantBundleSections(
  bundle: TenantBundleExportDocument,
): TenantBundleImportCounts {
  return {
    entityCategories: bundle.entityCategories.length,
    entityDefinitions: bundle.entityDefinitions.length,
    entityUiOverrides: bundle.entityUiOverrides.length,
    uiBuilderPresets: bundle.uiBuilderPresets.length,
    tenantDashboardLayout: bundle.tenantDashboardLayout ? 1 : 0,
    roles: bundle.roles.length,
    formulaDefinitions: bundle.formulaDefinitions.length,
    hooks: bundle.hooks.length,
    metricDefinitions: bundle.metricDefinitions.length,
    entityQueryDefinitions: bundle.entityQueryDefinitions.length,
    chartDefinitions: bundle.chartDefinitions.length,
    customViews: bundle.customViews.length,
  };
}
