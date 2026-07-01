import {
  createFirestoreAdminEntityCategoryRepository,
  createFirestoreAdminEntityDefinitionRepository,
  createFirestoreAdminEntityQueryDefinitionRepository,
  createFirestoreAdminCustomViewRepository,
  createFirestoreAdminEntityUiOverrideRepository,
  createFirestoreAdminHookRepository,
  createFirestoreAdminMetricDefinitionRepository,
  createFirestoreAdminTenantDashboardLayoutRepository,
  createFirestoreAdminTenantRepository,
  createFirestoreAdminTenantRoleRepository,
  createFirestoreAdminUiBuilderPresetRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import {
  TENANT_BUNDLE_EXPORT_VERSION,
  tenantBundleExportDocumentSchema,
  type TenantBundleExportDocument,
} from "@repo/tenant-bundle";

interface ExportTenantBundleDeps {
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
  const customViewRepository = createFirestoreAdminCustomViewRepository(
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
    customViews,
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
    customViewRepository.list(tenantId),
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
    customViews,
  });
}
