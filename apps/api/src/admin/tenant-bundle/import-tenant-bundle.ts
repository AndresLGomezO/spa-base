import {
  createFirestoreAdminTenantRepository,
  replaceTenantCollectionDocuments,
  serializeDataHookForFirestore,
  type FirebaseAdminConfig,
  type TenantCollectionDocument,
} from "@repo/gcp-firebase";
import { dataHookDefinitionSchema, type DataHookDefinition } from "@repo/hooks";
import {
  entityUiOverrideRecordSchema,
  tenantDashboardLayoutRecordSchema,
  toPersistedTenantDashboardLayout,
  toPersistedUiBuilderPreset,
  toPersistedUiOverride,
  type EntityUiOverrideRecord,
  type TenantDashboardLayoutRecord,
} from "@repo/entities";
import {
  countTenantBundleSections,
  parseTenantBundleDocument,
  rewriteTenantBundleTenantId,
  TENANT_BUNDLE_COLLECTION_IMPORT_ORDER,
  type TenantBundleExportDocument,
  type TenantBundleImportCounts,
} from "@repo/tenant-bundle";

import type { SyncTenantAiContextsDeps } from "../../ai/sync-tenant-ai-contexts.js";
import {
  syncEntityAiContextsForTenant,
  syncThemeAiContextForTenant,
} from "../../ai/sync-tenant-ai-contexts.js";

interface ImportTenantBundleDeps {
  readonly firebaseAdminConfig: FirebaseAdminConfig;
  readonly entityRuntime?: SyncTenantAiContextsDeps["entityRuntime"];
  readonly tenantAiContextSync?: SyncTenantAiContextsDeps;
}

interface ImportTenantBundleResult {
  readonly sourceTenantId: string;
  readonly counts: TenantBundleImportCounts;
}

function toPlainRecord(
  record: Record<string, unknown>,
): Record<string, unknown> {
  return { ...record };
}

function buildCollectionDocuments(
  bundle: TenantBundleExportDocument,
): Record<
  (typeof TENANT_BUNDLE_COLLECTION_IMPORT_ORDER)[number],
  readonly TenantCollectionDocument[]
> {
  return {
    entity_categories: bundle.entityCategories.map((record) => ({
      id: record.id,
      data: toPlainRecord(record as unknown as Record<string, unknown>),
    })),
    entity_definitions: bundle.entityDefinitions.map((record) => ({
      id: record.id,
      data: toPlainRecord(record as unknown as Record<string, unknown>),
    })),
    entity_ui_overrides: bundle.entityUiOverrides.map((record) => ({
      id: record.entityName,
      data: toPlainRecord(
        toPersistedUiOverride(
          entityUiOverrideRecordSchema.parse(record) as EntityUiOverrideRecord,
        ) as unknown as Record<string, unknown>,
      ),
    })),
    ui_builder_presets: bundle.uiBuilderPresets.map((record) => ({
      id: record.id,
      data: toPlainRecord(
        toPersistedUiBuilderPreset(record) as unknown as Record<
          string,
          unknown
        >,
      ),
    })),
    tenant_dashboard_layouts: bundle.tenantDashboardLayout
      ? [
          {
            id: bundle.tenantDashboardLayout.tenantId,
            data: toPlainRecord(
              toPersistedTenantDashboardLayout(
                tenantDashboardLayoutRecordSchema.parse(
                  bundle.tenantDashboardLayout,
                ) as TenantDashboardLayoutRecord,
              ) as unknown as Record<string, unknown>,
            ),
          },
        ]
      : [],
    roles: bundle.roles.map((record) => ({
      id: record.id,
      data: toPlainRecord(record as unknown as Record<string, unknown>),
    })),
    __formula_definitions: bundle.formulaDefinitions
      .filter((record) => record.source === "tenant")
      .map((record) => ({
        id: record.id,
        data: toPlainRecord(record as unknown as Record<string, unknown>),
      })),
    __data_hooks: bundle.hooks.map((record) => ({
      id: record.id,
      data: serializeDataHookForFirestore(
        dataHookDefinitionSchema.parse(record) as DataHookDefinition,
      ),
    })),
    __metrics_definitions: bundle.metricDefinitions.map((record) => ({
      id: record.id,
      data: toPlainRecord(record as unknown as Record<string, unknown>),
    })),
    __entity_query_definitions: bundle.entityQueryDefinitions.map((record) => ({
      id: record.id,
      data: toPlainRecord(record as unknown as Record<string, unknown>),
    })),
    __custom_views: bundle.customViews.map((record) => ({
      id: record.id,
      data: toPlainRecord(record as unknown as Record<string, unknown>),
    })),
  };
}

export async function importTenantBundle(
  deps: ImportTenantBundleDeps,
  targetTenantId: string,
  bundleInput: TenantBundleExportDocument,
): Promise<ImportTenantBundleResult> {
  const tenantRepository = createFirestoreAdminTenantRepository(
    deps.firebaseAdminConfig,
  );
  const tenant = await tenantRepository.getById(targetTenantId);
  if (!tenant) {
    throw new Error("Tenant not found.");
  }

  const parsed = parseTenantBundleDocument(JSON.stringify(bundleInput));
  const bundle = rewriteTenantBundleTenantId(parsed, targetTenantId);
  const documentsByCollection = buildCollectionDocuments(bundle);

  for (const collectionName of TENANT_BUNDLE_COLLECTION_IMPORT_ORDER) {
    await replaceTenantCollectionDocuments(
      deps.firebaseAdminConfig,
      targetTenantId,
      collectionName,
      documentsByCollection[collectionName],
    );
  }

  if (bundle.appearance !== undefined) {
    await tenantRepository.update(targetTenantId, {
      appearance: bundle.appearance,
    });
  }

  const entityRuntime =
    deps.entityRuntime ?? deps.tenantAiContextSync?.entityRuntime;
  if (entityRuntime) {
    await entityRuntime.loadTenantDefinitions(targetTenantId, { force: true });
    entityRuntime.ensureCatalogIndexes(targetTenantId);
  }

  if (deps.tenantAiContextSync) {
    await syncThemeAiContextForTenant(deps.tenantAiContextSync, targetTenantId);
    await syncEntityAiContextsForTenant(
      deps.tenantAiContextSync,
      targetTenantId,
    );
  }

  return {
    sourceTenantId: bundle.sourceTenantId,
    counts: countTenantBundleSections(bundle),
  };
}
