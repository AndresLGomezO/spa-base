/**
 * Browser-safe entry point for @repo/tenant-bundle.
 * Web and other client bundles must import from this module, never from the
 * package root — the root is intended for API/server usage alongside the same
 * schemas, while this entry avoids transitive Node-only dependencies.
 */
export {
  assertTenantBundleCollectionImportOrder,
  countTenantBundleSections,
  parseTenantBundleDocument,
  rewriteTenantBundleTenantId,
  serializeTenantBundle,
  TENANT_BUNDLE_COLLECTION_IMPORT_ORDER,
  TENANT_BUNDLE_EXPORT_VERSION,
  tenantBundleExportDocumentSchema,
  validateTenantBundleImport,
  type TenantBundleCollectionName,
  type TenantBundleImportError,
  type TenantBundleImportValidationResult,
} from "./tenant-bundle-import-export.js";
export type {
  TenantBundleExportDocument,
  TenantBundleImportCounts,
} from "./tenant-bundle-schema.js";
