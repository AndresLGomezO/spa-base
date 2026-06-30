import {
  ENTITY_CATEGORIES_COLLECTION,
} from "@repo/entity-categories";
import { ENTITY_DEFINITIONS_COLLECTION } from "@repo/dynamic-entities";
import { ENTITY_QUERY_DEFINITIONS_COLLECTION } from "@repo/entity-queries";
import {
  ENTITY_UI_OVERRIDES_COLLECTION,
  TENANT_DASHBOARD_LAYOUTS_COLLECTION,
  UI_BUILDER_PRESETS_COLLECTION,
} from "@repo/entities";
import {
  createFirestoreAdminEntityCategoryRepository,
  createFirestoreAdminEntityDefinitionRepository,
  createFirestoreAdminEntityQueryDefinitionRepository,
  createFirestoreAdminEntityUiOverrideRepository,
  createFirestoreAdminHookRepository,
  createFirestoreAdminMetricDefinitionRepository,
  createFirestoreAdminTenantDashboardLayoutRepository,
  createFirestoreAdminTenantRepository,
  createFirestoreAdminTenantRoleRepository,
  createFirestoreAdminUiBuilderPresetRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import { HOOKS_COLLECTION } from "@repo/hooks";
import { METRICS_DEFINITIONS_COLLECTION } from "@repo/metrics-engine";
import { TENANT_ROLES_SUBCOLLECTION } from "@repo/rbac";
import {
  TENANT_BUNDLE_EXPORT_VERSION,
  tenantBundleExportDocumentSchema,
  type TenantBundleExportDocument,
} from "@repo/tenant-bundle";

export interface ExportTenantBundleDeps {
  readonly firebaseAdminConfig: FirebaseAdminConfig;
}

export async function exportTenantBundle(
  deps: ExportTenantBundleDeps,
  tenantId: string,
): Promise<TenantBundleExportDocument> {
  const tenantRepository = createFirestoreAdminTenantRepository(
    deps.firebaseAdminConfig,
  );
  const categoryRepository = createFirestoreAdminEntityCategoryRepository(
    deps.firebaseAdminConfig,
  );
  const definitionRepository = createFirestoreAdminEntityDefinitionRepository(
    deps.firebaseAdminConfig,
  );
  const uiOverrideRepository = createFirestoreAdminEntityUiOverrideRepository(
    deps.firebaseAdminConfig,
  );
  const presetRepository = createFirestoreAdminUiBuilderPresetRepository(
    deps.firebaseAdminConfig,
  );
  const dashboardLayoutRepository =
    createFirestoreAdminTenantDashboardLayoutRepository(
      deps.firebaseAdminConfig,
    );
  const roleRepository = createFirestoreAdminTenantRoleRepository(
    deps.firebaseAdminConfig,
  );
  const hookRepository = createFirestoreAdminHookRepository(
    deps.firebaseAdminConfig,
  );
  const metricDefinitionRepository =
    createFirestoreAdminMetricDefinitionRepository(deps.firebaseAdminConfig);
  const queryDefinitionRepository =
    createFirestoreAdminEntityQueryDefinitionRepository(
      deps.firebaseAdminConfig,
    );

  const tenant = await tenantRepository.getById(tenantId);
  if (!tenant) {
    throw new Error("Tenant not found.");
  }

  const [
    entityCategories,
    entityDefinitions,
    entityUiOverrides,
    uiBuilderPresets,
    tenantDashboardLayout,
    roles,
    hooks,
    metricDefinitions,
    entityQueryDefinitions,
  ] = await Promise.all([
    categoryRepository.list(tenantId),
    definitionRepository.list(tenantId),
    uiOverrideRepository.list(tenantId),
    presetRepository.list(tenantId),
    dashboardLayoutRepository.get(tenantId),
    roleRepository.list(tenantId),
    hookRepository.list(tenantId),
    metricDefinitionRepository.list(tenantId),
    queryDefinitionRepository.list(tenantId),
  ]);

  return tenantBundleExportDocumentSchema.parse({
    version: TENANT_BUNDLE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    sourceTenantId: tenantId,
    ...(tenant.appearance ? { appearance: tenant.appearance } : {}),
    entityCategories,
    entityDefinitions,
    entityUiOverrides,
    uiBuilderPresets,
    tenantDashboardLayout,
    roles,
    hooks,
    metricDefinitions,
    entityQueryDefinitions,
  });
}

export const TENANT_BUNDLE_EXPORT_COLLECTIONS = {
  entityCategories: ENTITY_CATEGORIES_COLLECTION,
  entityDefinitions: ENTITY_DEFINITIONS_COLLECTION,
  entityUiOverrides: ENTITY_UI_OVERRIDES_COLLECTION,
  uiBuilderPresets: UI_BUILDER_PRESETS_COLLECTION,
  tenantDashboardLayout: TENANT_DASHBOARD_LAYOUTS_COLLECTION,
  roles: TENANT_ROLES_SUBCOLLECTION,
  hooks: HOOKS_COLLECTION,
  metricDefinitions: METRICS_DEFINITIONS_COLLECTION,
  entityQueryDefinitions: ENTITY_QUERY_DEFINITIONS_COLLECTION,
} as const;
