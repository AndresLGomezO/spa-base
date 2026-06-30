import type { EntityDefinitionRecord } from "@repo/dynamic-entities";
import type { HookRecord } from "@repo/hooks";

import {
  TENANT_BUNDLE_EXPORT_VERSION,
  tenantBundleExportDocumentSchema,
  type TenantBundleExportDocument,
} from "./tenant-bundle-schema.js";

export {
  TENANT_BUNDLE_EXPORT_VERSION,
  countTenantBundleSections,
  tenantBundleExportDocumentSchema,
  type TenantBundleExportDocument,
  type TenantBundleImportCounts,
} from "./tenant-bundle-schema.js";

export interface TenantBundleImportError {
  readonly path: string;
  readonly message: string;
}

export type TenantBundleImportValidationResult =
  | { readonly ok: true; readonly data: TenantBundleExportDocument }
  | { readonly ok: false; readonly errors: readonly TenantBundleImportError[] };

function zodIssuesToImportErrors(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): readonly TenantBundleImportError[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.map(String).join(".") : "$",
    message: issue.message,
  }));
}

function collectRelationTargets(
  definitions: readonly EntityDefinitionRecord[],
): readonly string[] {
  const targets: string[] = [];
  for (const definition of definitions) {
    for (const field of definition.fields) {
      if (field.type === "relation" && field.relation?.target) {
        targets.push(field.relation.target);
      }
    }
  }
  return targets;
}

function validateTenantBundleCrossReferences(
  bundle: TenantBundleExportDocument,
): readonly TenantBundleImportError[] {
  const errors: TenantBundleImportError[] = [];
  const entityNames = new Set(bundle.entityDefinitions.map((item) => item.name));
  const categoryIds = new Set(bundle.entityCategories.map((item) => item.id));

  for (const definition of bundle.entityDefinitions) {
    if (
      definition.navCategoryId &&
      !categoryIds.has(definition.navCategoryId)
    ) {
      errors.push({
        path: `entityDefinitions.${definition.name}.navCategoryId`,
        message: `Unknown category id "${definition.navCategoryId}".`,
      });
    }
  }

  for (const target of collectRelationTargets(bundle.entityDefinitions)) {
    if (!entityNames.has(target)) {
      errors.push({
        path: "entityDefinitions",
        message: `Relation target "${target}" is not defined in entityDefinitions.`,
      });
    }
  }

  for (const override of bundle.entityUiOverrides) {
    if (!entityNames.has(override.entityName)) {
      errors.push({
        path: `entityUiOverrides.${override.entityName}`,
        message: `Unknown entity "${override.entityName}".`,
      });
    }
  }

  for (const hook of bundle.hooks) {
    errors.push(...validateHookReferences(hook, entityNames));
  }

  for (const metric of bundle.metricDefinitions) {
    if (!entityNames.has(metric.sourceModel)) {
      errors.push({
        path: `metricDefinitions.${metric.id}.sourceModel`,
        message: `Unknown source model "${metric.sourceModel}".`,
      });
    }
  }

  for (const query of bundle.entityQueryDefinitions) {
    if (!entityNames.has(query.sourceEntity)) {
      errors.push({
        path: `entityQueryDefinitions.${query.id}.sourceEntity`,
        message: `Unknown source entity "${query.sourceEntity}".`,
      });
    }
  }

  return errors;
}

function validateHookReferences(
  hook: HookRecord,
  entityNames: ReadonlySet<string>,
): readonly TenantBundleImportError[] {
  const errors: TenantBundleImportError[] = [];

  if (!entityNames.has(hook.entity)) {
    errors.push({
      path: `hooks.${hook.id}.entity`,
      message: `Unknown entity "${hook.entity}".`,
    });
  }

  for (const [index, action] of hook.config.actions.entries()) {
    if (action.type === "createRecord" && !entityNames.has(action.entity)) {
      errors.push({
        path: `hooks.${hook.id}.config.actions[${String(index)}].entity`,
        message: `Unknown entity "${action.entity}".`,
      });
    }
  }

  return errors;
}

function parseTenantBundleJson(json: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch {
    throw new Error("Invalid JSON syntax.");
  }
}

export function parseTenantBundleDocument(
  json: string,
): TenantBundleExportDocument {
  const parsed = parseTenantBundleJson(json);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as TenantBundleExportDocument).version !== "number"
  ) {
    throw new Error("Invalid tenant bundle: missing version.");
  }

  const version = (parsed as TenantBundleExportDocument).version;
  if (version !== TENANT_BUNDLE_EXPORT_VERSION) {
    throw new Error(
      `Unsupported tenant bundle version ${String(version)}. Expected ${TENANT_BUNDLE_EXPORT_VERSION}.`,
    );
  }

  const schemaResult = tenantBundleExportDocumentSchema.safeParse(parsed);
  if (!schemaResult.success) {
    throw new Error(
      zodIssuesToImportErrors(schemaResult.error)[0]?.message ??
        "Invalid tenant bundle.",
    );
  }

  const crossRefErrors = validateTenantBundleCrossReferences(schemaResult.data);
  if (crossRefErrors.length > 0) {
    throw new Error(crossRefErrors[0]?.message ?? "Invalid tenant bundle.");
  }

  return schemaResult.data;
}

export function validateTenantBundleImport(
  json: string,
): TenantBundleImportValidationResult {
  if (json.trim().length === 0) {
    return { ok: false, errors: [] };
  }

  try {
    const parsed = parseTenantBundleJson(json);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as TenantBundleExportDocument).version !== "number"
    ) {
      return {
        ok: false,
        errors: [{ path: "$", message: "Invalid tenant bundle: missing version." }],
      };
    }

    const version = (parsed as TenantBundleExportDocument).version;
    if (version !== TENANT_BUNDLE_EXPORT_VERSION) {
      return {
        ok: false,
        errors: [
          {
            path: "$.version",
            message: `Unsupported tenant bundle version ${String(version)}. Expected ${TENANT_BUNDLE_EXPORT_VERSION}.`,
          },
        ],
      };
    }

    const schemaResult = tenantBundleExportDocumentSchema.safeParse(parsed);
    if (!schemaResult.success) {
      return { ok: false, errors: zodIssuesToImportErrors(schemaResult.error) };
    }

    const crossRefErrors = validateTenantBundleCrossReferences(
      schemaResult.data,
    );
    if (crossRefErrors.length > 0) {
      return { ok: false, errors: crossRefErrors };
    }

    return { ok: true, data: schemaResult.data };
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          path: "$",
          message:
            error instanceof Error
              ? error.message
              : "Unable to import tenant bundle.",
        },
      ],
    };
  }
}

export function serializeTenantBundle(
  bundle: TenantBundleExportDocument,
): string {
  return `${JSON.stringify(bundle, null, 2)}\n`;
}

export function rewriteTenantBundleTenantId(
  bundle: TenantBundleExportDocument,
  targetTenantId: string,
): TenantBundleExportDocument {
  return tenantBundleExportDocumentSchema.parse({
    ...bundle,
    entityCategories: bundle.entityCategories.map((record) => ({
      ...record,
      tenantId: targetTenantId,
    })),
    entityDefinitions: bundle.entityDefinitions.map((record) => ({
      ...record,
      tenantId: targetTenantId,
    })),
    tenantDashboardLayout: bundle.tenantDashboardLayout
      ? {
          ...bundle.tenantDashboardLayout,
          tenantId: targetTenantId,
        }
      : null,
    roles: bundle.roles.map((record) => ({
      ...record,
      tenantId: targetTenantId,
    })),
    hooks: bundle.hooks.map((record) => ({
      ...record,
      tenantId: targetTenantId,
    })),
    metricDefinitions: bundle.metricDefinitions.map((record) => ({
      ...record,
      tenantId: targetTenantId,
    })),
    entityQueryDefinitions: bundle.entityQueryDefinitions.map((record) => ({
      ...record,
      tenantId: targetTenantId,
    })),
  });
}

export const TENANT_BUNDLE_COLLECTION_IMPORT_ORDER = [
  "entity_categories",
  "entity_definitions",
  "entity_ui_overrides",
  "ui_builder_presets",
  "tenant_dashboard_layouts",
  "roles",
  "hooks",
  "__metrics_definitions",
  "__entity_query_definitions",
] as const;

export type TenantBundleCollectionName =
  (typeof TENANT_BUNDLE_COLLECTION_IMPORT_ORDER)[number];

export function assertTenantBundleCollectionImportOrder(
  collections: readonly string[],
): void {
  const expected = [...TENANT_BUNDLE_COLLECTION_IMPORT_ORDER];
  if (
    collections.length !== expected.length ||
    collections.some((name, index) => name !== expected[index])
  ) {
    throw new Error("Tenant bundle collection import order mismatch.");
  }
}
