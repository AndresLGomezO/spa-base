import {
  createFirestoreAdminTenantRepository,
  replaceTenantCollectionDocuments,
  type FirebaseAdminConfig,
  type TenantCollectionDocument,
} from "@repo/gcp-firebase";
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
    hooks: bundle.hooks.map((record) => ({
      id: record.id,
      data: toPlainRecord(record as unknown as Record<string, unknown>),
    })),
    __metrics_definitions: bundle.metricDefinitions.map((record) => ({
      id: record.id,
      data: toPlainRecord(record as unknown as Record<string, unknown>),
    })),
    __entity_query_definitions: bundle.entityQueryDefinitions.map((record) => ({
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

  if (deps.tenantAiContextSync) {
    await deps.tenantAiContextSync.entityRuntime.loadTenantDefinitions(
      targetTenantId,
      { force: true },
    );
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
