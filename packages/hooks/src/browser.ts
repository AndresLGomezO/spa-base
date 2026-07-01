/**
 * Browser-safe entry point for @repo/hooks JSON import/export.
 */
export {
  DATA_HOOK_DEFINITION_JSON_VERSION,
  DATA_HOOK_DEFINITION_JSON_KIND,
  DATA_HOOKS_CATALOG_JSON_KIND,
  catalogHookKey,
  toPortableDataHookDefinition,
  createDataHookDefinitionEnvelope,
  createDataHooksCatalogEnvelope,
  parseDataHookDefinitionJson,
  validateDataHookDefinitionImport,
  parseDataHooksCatalogJson,
  validateDataHooksCatalogImport,
  validateDataHooksCatalogEnvelope,
  computeDataHooksCatalogReplacePlan,
  dataHooksCatalogEnvelopeSchema,
} from "./data-hook-definition-json.js";
export type {
  DataHookDefinitionJsonError,
  PortableDataHookDefinition,
  DataHookDefinitionFormData,
  DataHooksCatalogEnvelope,
  DataHooksCatalogReplacePlan,
} from "./data-hook-definition-json.js";
export type {
  DataHookDefinition,
  CreateDataHookInput,
} from "./data-hook-definition.js";
