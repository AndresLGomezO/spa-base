import {
  buildDefaultCustomViewUI,
  computeCatalogReplacePlan,
  formatCustomViewLabel,
  portableToCreateCustomViewInput,
  slugCustomViewId,
  type CreateCustomViewInput,
  type CustomViewRecord,
  type CustomViewsCatalogEnvelope,
  type CustomViewUIConfig,
  type PatchCustomViewInput,
  type PortableCustomViewDefinition,
} from "@repo/custom-views";
import { normalizeEntityViews, type ViewConfig } from "@repo/entities";
import { assertNavCategoryExists } from "@repo/dynamic-entities";

import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import type {
  CustomViewRepository,
  EntityCategoryRepository,
  EntityQueryDefinitionRepository,
} from "@repo/firestore-converters";
import {
  getEntityFieldNames,
  validateCustomViewUIConfig,
} from "./validate-custom-view-ui.js";

interface ReplaceCustomViewsCatalogDeps {
  readonly entityRuntime: EntityRuntimeContext;
  readonly customViewRepository: CustomViewRepository;
  readonly entityQueryDefinitionRepository: EntityQueryDefinitionRepository;
  readonly entityCategoryRepository: EntityCategoryRepository;
}

export class CustomViewCatalogReplaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomViewCatalogReplaceError";
  }
}

interface ReplaceCustomViewsCatalogResult {
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly items: readonly CustomViewRecord[];
}

function normalizeCustomViewUiInput(
  ui: NonNullable<CreateCustomViewInput["ui"]>,
): CustomViewUIConfig {
  return {
    ...ui,
    views: normalizeEntityViews(ui.views as readonly ViewConfig[]),
  } as CustomViewUIConfig;
}

function toRepositoryUi(
  ui: CustomViewUIConfig,
): NonNullable<CreateCustomViewInput["ui"]> {
  return {
    ...ui,
    views: [...ui.views],
  } as NonNullable<CreateCustomViewInput["ui"]>;
}

function createPatchFromPortable(
  portable: PortableCustomViewDefinition,
  entityQueryDefinitionId: string,
): PatchCustomViewInput {
  return {
    name: portable.name,
    ...(portable.description !== undefined
      ? { description: portable.description }
      : {}),
    entityQueryDefinitionId,
    status: portable.status,
    ...(portable.hiddenFromNav !== undefined
      ? { hiddenFromNav: portable.hiddenFromNav }
      : {}),
    ...(portable.navCategoryId !== undefined
      ? { navCategoryId: portable.navCategoryId }
      : {}),
    ...(portable.navOrder !== undefined ? { navOrder: portable.navOrder } : {}),
    nav: portable.nav,
    ...(portable.ui !== undefined ? { ui: portable.ui } : {}),
  };
}

async function resolveQueryDefinition(
  repository: EntityQueryDefinitionRepository,
  tenantId: string,
  entityQueryDefinitionName: string,
  queriesByName: ReadonlyMap<
    string,
    {
      readonly id: string;
      readonly sourceEntity: string;
      readonly status: string;
    }
  >,
) {
  const definition = queriesByName.get(entityQueryDefinitionName);
  if (!definition) {
    throw new CustomViewCatalogReplaceError(
      `Unknown entity query definition "${entityQueryDefinitionName}".`,
    );
  }
  if (definition.status !== "ACTIVE") {
    throw new CustomViewCatalogReplaceError(
      `Entity query definition "${entityQueryDefinitionName}" must be ACTIVE.`,
    );
  }
  void repository;
  void tenantId;
  return definition;
}

async function validateAndResolvePortable(
  deps: ReplaceCustomViewsCatalogDeps,
  tenantId: string,
  portable: PortableCustomViewDefinition,
  queriesByName: ReadonlyMap<
    string,
    {
      readonly id: string;
      readonly sourceEntity: string;
      readonly status: string;
    }
  >,
): Promise<{
  readonly entityQueryDefinitionId: string;
  readonly sourceEntity: string;
  readonly createInput: CreateCustomViewInput;
}> {
  const queryDefinition = await resolveQueryDefinition(
    deps.entityQueryDefinitionRepository,
    tenantId,
    portable.entityQueryDefinitionName,
    queriesByName,
  );

  await assertNavCategoryExists(
    deps.entityCategoryRepository,
    tenantId,
    portable.navCategoryId,
  );

  const entity = deps.entityRuntime.getEntityDefinition(
    queryDefinition.sourceEntity,
    tenantId,
  );
  if (!entity) {
    throw new CustomViewCatalogReplaceError(
      `Unknown source entity "${queryDefinition.sourceEntity}".`,
    );
  }

  const fieldNames = getEntityFieldNames(entity);
  const defaultUi = buildDefaultCustomViewUI(
    queryDefinition.sourceEntity,
    fieldNames,
  );
  const ui: CustomViewUIConfig = portable.ui
    ? normalizeCustomViewUiInput(portable.ui)
    : defaultUi;
  validateCustomViewUIConfig(entity, ui);

  const createInput = portableToCreateCustomViewInput(
    portable,
    queryDefinition.id,
  );

  return {
    entityQueryDefinitionId: queryDefinition.id,
    sourceEntity: queryDefinition.sourceEntity,
    createInput: {
      ...createInput,
      viewId: portable.viewId.trim().toLowerCase(),
      nav: portable.nav,
      ui: toRepositoryUi(ui),
    },
  };
}

export async function replaceCustomViewsCatalog(
  deps: ReplaceCustomViewsCatalogDeps,
  tenantId: string,
  catalog: CustomViewsCatalogEnvelope,
): Promise<ReplaceCustomViewsCatalogResult> {
  const existing = await deps.customViewRepository.list(tenantId);
  const plan = computeCatalogReplacePlan({
    existing,
    imported: catalog.customViews,
  });

  await deps.entityRuntime.loadTenantDefinitions(tenantId);

  const queryDefinitions =
    await deps.entityQueryDefinitionRepository.list(tenantId);
  const queriesByName = new Map(
    queryDefinitions.map((query) => [
      query.name,
      {
        id: query.id,
        sourceEntity: query.sourceEntity,
        status: query.status,
      },
    ]),
  );

  const resolvedByViewId = new Map<
    string,
    Awaited<ReturnType<typeof validateAndResolvePortable>>
  >();

  for (const portable of catalog.customViews) {
    const resolved = await validateAndResolvePortable(
      deps,
      tenantId,
      portable,
      queriesByName,
    );
    resolvedByViewId.set(portable.viewId, resolved);
  }

  for (const record of plan.toDelete) {
    await deps.customViewRepository.delete(tenantId, record.id);
  }

  for (const { existing: current, input } of plan.toUpdate) {
    const resolved = resolvedByViewId.get(input.viewId);
    if (!resolved) {
      continue;
    }

    if (resolved.sourceEntity !== current.sourceEntity) {
      throw new CustomViewCatalogReplaceError(
        `Cannot change query for view "${input.viewId}" to one targeting a different source entity.`,
      );
    }

    const entity = deps.entityRuntime.getEntityDefinition(
      current.sourceEntity,
      tenantId,
    );
    if (!entity) {
      throw new CustomViewCatalogReplaceError(
        `Unknown source entity "${current.sourceEntity}".`,
      );
    }

    const patch = createPatchFromPortable(
      input,
      resolved.entityQueryDefinitionId,
    );
    if (input.ui) {
      const nextUi = normalizeCustomViewUiInput(input.ui);
      validateCustomViewUIConfig(entity, nextUi);
      await deps.customViewRepository.update(tenantId, current.id, {
        ...patch,
        ui: toRepositoryUi(nextUi),
        sourceEntity: resolved.sourceEntity,
      });
    } else {
      await deps.customViewRepository.update(tenantId, current.id, {
        ...patch,
        sourceEntity: resolved.sourceEntity,
      });
    }
  }

  for (const input of plan.toCreate) {
    const resolved = resolvedByViewId.get(input.viewId);
    if (!resolved) {
      continue;
    }

    const nav = resolved.createInput.nav ?? {
      label: formatCustomViewLabel(resolved.createInput.name),
    };

    await deps.customViewRepository.create(tenantId, {
      ...resolved.createInput,
      viewId:
        resolved.createInput.viewId &&
        resolved.createInput.viewId.trim().length > 0
          ? resolved.createInput.viewId.trim().toLowerCase()
          : slugCustomViewId(resolved.createInput.name),
      nav,
      sourceEntity: resolved.sourceEntity,
    });
  }

  const items = await deps.customViewRepository.list(tenantId);

  return {
    counts: plan.counts,
    items,
  };
}
