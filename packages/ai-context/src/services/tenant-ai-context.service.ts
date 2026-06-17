import type { SerializableEntityDefinition } from "@repo/entities";
import type { TenantAppearance } from "@repo/shared-types";
import {
  listEntityFieldSelectorFieldOptions,
  listFormFieldOptions,
  type FieldPathValidationDefinition,
} from "@repo/ui-builder-core";

import { assembleUiBuilderContext } from "../assembler/assemble-ui-builder-context.js";
import type { UiBuilderContextRequest } from "../assembler/assemble-ui-builder-context.js";
import { buildThemeContext } from "../builders/build-theme-context.js";
import {
  buildEntityCatalogFragment,
  buildEntityCurrentFragment,
  buildEntityTenantFragment,
  extractCatalogSummaries,
  resolveLayoutFieldPathsForEntity,
  toFieldPathValidationDefinition,
  type EntityTenantSummaryInput,
} from "../builders/build-entity-context.js";
import { buildTenantAiContextDocId, hashSourceValue } from "../utils/hash.js";
import type {
  TenantAiContextRecord,
  TenantAiContextRepository,
} from "../storage/tenant-ai-context.schema.js";

export interface TenantAiContextServiceDeps {
  readonly repository: TenantAiContextRepository;
}

export interface BuildEntityContextsInput {
  readonly tenant: EntityTenantSummaryInput;
  readonly entities: readonly SerializableEntityDefinition[];
  readonly categoryNames: Readonly<Record<string, string>>;
  readonly targetEntityName: string;
  readonly resolveTarget: (
    target: string,
  ) => FieldPathValidationDefinition | undefined;
}

export async function upsertThemeAiContext(
  deps: TenantAiContextServiceDeps,
  tenantId: string,
  appearance: TenantAppearance | undefined,
): Promise<TenantAiContextRecord> {
  const built = buildThemeContext(appearance);
  const record: TenantAiContextRecord = {
    id: buildTenantAiContextDocId("theme"),
    tenantId,
    kind: "theme",
    sourceHash: built.sourceHash,
    fragments: built.fragments,
    assembled: built.assembled,
    updatedAt: new Date().toISOString(),
  };
  return deps.repository.upsert(record);
}

export async function upsertEntityCatalogAiContext(
  deps: TenantAiContextServiceDeps,
  input: BuildEntityContextsInput,
  sourceHash: string,
): Promise<TenantAiContextRecord> {
  const summaries = extractCatalogSummaries(
    input.entities,
    input.categoryNames,
  );
  const tenantFragment = buildEntityTenantFragment(input.tenant);
  const catalogFragment = buildEntityCatalogFragment({
    tenant: input.tenant,
    entities: summaries,
  });

  const record: TenantAiContextRecord = {
    id: buildTenantAiContextDocId("entityCatalog"),
    tenantId: input.tenant.tenantId,
    kind: "entityCatalog",
    sourceHash,
    fragments: {
      "entity.tenant": tenantFragment,
      "entity.catalog": catalogFragment,
    },
    assembled: `${tenantFragment}\n\n${catalogFragment}`,
    updatedAt: new Date().toISOString(),
  };
  return deps.repository.upsert(record);
}

export async function upsertEntityAiContext(
  deps: TenantAiContextServiceDeps,
  input: BuildEntityContextsInput,
  entity: SerializableEntityDefinition,
  sourceHash: string,
): Promise<TenantAiContextRecord> {
  const definition = toFieldPathValidationDefinition(entity);
  const layoutFieldPaths = resolveLayoutFieldPathsForEntity(
    entity,
    input.resolveTarget,
  );
  const formFieldPaths = listFormFieldOptions(definition);
  const entityFieldSelectorPaths =
    listEntityFieldSelectorFieldOptions(definition);

  const currentFragment = buildEntityCurrentFragment({
    entity,
    layoutFieldPaths,
    formFieldPaths,
    entityFieldSelectorPaths,
  });

  const record: TenantAiContextRecord = {
    id: buildTenantAiContextDocId("entity", entity.name),
    tenantId: input.tenant.tenantId,
    kind: "entity",
    scopeKey: entity.name,
    sourceHash,
    fragments: {
      "entity.current": currentFragment,
    },
    assembled: currentFragment,
    updatedAt: new Date().toISOString(),
  };
  return deps.repository.upsert(record);
}

export async function syncTenantEntityAiContexts(
  deps: TenantAiContextServiceDeps,
  input: BuildEntityContextsInput,
  sourceHash: string,
): Promise<void> {
  await upsertEntityCatalogAiContext(deps, input, sourceHash);
  const target = input.entities.find(
    (entity) => entity.name === input.targetEntityName,
  );
  if (target) {
    await upsertEntityAiContext(deps, input, target, sourceHash);
  }
}

export async function syncAllEntityAiContextsForTenant(
  deps: TenantAiContextServiceDeps,
  input: Omit<BuildEntityContextsInput, "targetEntityName">,
  sourceHash: string,
): Promise<void> {
  await upsertEntityCatalogAiContext(
    deps,
    { ...input, targetEntityName: "" },
    sourceHash,
  );
  for (const entity of input.entities) {
    await upsertEntityAiContext(
      deps,
      { ...input, targetEntityName: entity.name },
      entity,
      sourceHash,
    );
  }
}

export async function getOrBuildThemeContext(
  deps: TenantAiContextServiceDeps,
  tenantId: string,
  appearance: TenantAppearance | undefined,
): Promise<TenantAiContextRecord> {
  const id = buildTenantAiContextDocId("theme");
  const expectedHash = buildThemeContext(appearance).sourceHash;
  const existing = await deps.repository.get(tenantId, id);
  if (existing && existing.sourceHash === expectedHash) {
    return existing;
  }
  return upsertThemeAiContext(deps, tenantId, appearance);
}

export async function getEntityContextFragments(
  deps: TenantAiContextServiceDeps,
  input: BuildEntityContextsInput,
  sourceHash: string,
): Promise<{
  readonly tenantFragment: string;
  readonly catalogFragment: string;
  readonly currentFragment: string;
}> {
  const catalogId = buildTenantAiContextDocId("entityCatalog");
  const entityId = buildTenantAiContextDocId("entity", input.targetEntityName);

  let catalogRecord = await deps.repository.get(
    input.tenant.tenantId,
    catalogId,
  );
  if (!catalogRecord || catalogRecord.sourceHash !== sourceHash) {
    catalogRecord = await upsertEntityCatalogAiContext(deps, input, sourceHash);
  }

  const targetEntity = input.entities.find(
    (entity) => entity.name === input.targetEntityName,
  );
  if (!targetEntity) {
    throw new Error(`Entity "${input.targetEntityName}" not found in catalog.`);
  }

  let entityRecord = await deps.repository.get(input.tenant.tenantId, entityId);
  if (!entityRecord || entityRecord.sourceHash !== sourceHash) {
    entityRecord = await upsertEntityAiContext(
      deps,
      input,
      targetEntity,
      sourceHash,
    );
  }

  return {
    tenantFragment:
      catalogRecord.fragments["entity.tenant"] ??
      buildEntityTenantFragment(input.tenant),
    catalogFragment:
      catalogRecord.fragments["entity.catalog"] ??
      buildEntityCatalogFragment({
        tenant: input.tenant,
        entities: extractCatalogSummaries(input.entities, input.categoryNames),
      }),
    currentFragment:
      entityRecord.fragments["entity.current"] ?? entityRecord.assembled ?? "",
  };
}

export async function assembleUiBuilderContextForTenant(
  deps: TenantAiContextServiceDeps,
  input: BuildEntityContextsInput & {
    readonly appearance: TenantAppearance | undefined;
    readonly entitySourceHash: string;
    readonly request: UiBuilderContextRequest;
  },
) {
  const themeRecord = await getOrBuildThemeContext(
    deps,
    input.tenant.tenantId,
    input.appearance,
  );
  const entityFragments = await getEntityContextFragments(
    deps,
    input,
    input.entitySourceHash,
  );

  return assembleUiBuilderContext({
    request: input.request,
    themeFragments: themeRecord.fragments,
    entityTenantFragment: entityFragments.tenantFragment,
    entityCatalogFragment: entityFragments.catalogFragment,
    entityCurrentFragment: entityFragments.currentFragment,
  });
}

export function assembleUiBuilderContextFromRecords(input: {
  readonly request: UiBuilderContextRequest;
  readonly themeRecord: TenantAiContextRecord;
  readonly catalogRecord: TenantAiContextRecord;
  readonly entityRecord: TenantAiContextRecord;
}) {
  const tenantFragment =
    input.catalogRecord.fragments["entity.tenant"] ??
    input.catalogRecord.assembled ??
    "";
  const catalogFragment = input.catalogRecord.fragments["entity.catalog"] ?? "";
  const currentFragment =
    input.entityRecord.fragments["entity.current"] ??
    input.entityRecord.assembled ??
    "";

  return assembleUiBuilderContext({
    request: input.request,
    themeFragments: input.themeRecord.fragments,
    entityTenantFragment: tenantFragment,
    entityCatalogFragment: catalogFragment,
    entityCurrentFragment: currentFragment,
  });
}

export function computeEntityCatalogSourceHash(
  entities: readonly SerializableEntityDefinition[],
): string {
  const payload = entities.map((entity) => ({
    name: entity.name,
    fields: entity.fields,
    ui: entity.ui,
    displayField: entity.displayField,
    description: entity.description,
    navCategoryId: entity.navCategoryId,
  }));
  return hashSourceValue(payload);
}
