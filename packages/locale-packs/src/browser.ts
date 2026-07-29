/**
 * Browser-safe entry point for @repo/locale-packs JSON import/export.
 */
export {
  LOCALE_PACK_JSON_VERSION,
  LOCALE_PACK_JSON_KIND,
  LOCALE_PACKS_CATALOG_JSON_KIND,
  toPortableLocalePack,
  createLocalePackEnvelope,
  createLocalePacksCatalogEnvelope,
  parseLocalePackJson,
  validateLocalePackImport,
  parseLocalePacksCatalogJson,
  validateLocalePacksCatalogEnvelope,
  computeLocalePackCatalogReplacePlan,
  localePacksCatalogEnvelopeSchema,
} from "./locale-pack-json.js";
export type {
  LocalePackJsonError,
  LocalePackFormData,
  LocalePacksCatalogEnvelope,
  LocalePackCatalogReplacePlan,
} from "./locale-pack-json.js";
export {
  resolveTenantLabel,
  indexLocalePackMessages,
} from "./resolve-tenant-label.js";
export type { LocaleMessagesByLocale } from "./resolve-tenant-label.js";
export type { PortableLocalePack, LocalePack } from "./types.js";
export { computeReconciliationPlan } from "./reconcile.js";
export type {
  LocaleReconciliationDiff,
  ReconciliationPlan,
} from "./reconcile.js";
export type { HarvestedMessages } from "./harvest-record-walkers.js";
