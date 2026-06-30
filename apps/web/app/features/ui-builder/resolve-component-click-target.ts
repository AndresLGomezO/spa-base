import type {
  ComponentClickAction,
  DataSource,
  EntityNavigationTarget,
  EntityViewKind,
} from "@repo/ui-builder-core";
import type { SerializableEntityDefinition } from "@repo/entities";
import { resolveOneToManyForeignKeyField } from "@repo/entities";

import {
  parseRelationFieldPath,
  resolveRelationFieldName,
  type RelationDefinitionLookup,
} from "../../components/entity/resolve-relation-field-path";
import {
  buildEntityListCreatePath,
  buildEntityListEditPath,
  buildEntityListPath,
  type EntityReturnToState,
} from "../../routing/entity-navigation";

export interface ResolvedComponentClickTarget {
  readonly href: string;
  readonly external: boolean;
  readonly openInNewTab?: boolean;
  readonly state?: unknown;
}

interface ResolvedEntityNavigationScope {
  readonly entityName: string;
  readonly recordId?: string;
  readonly prefill?: Readonly<Record<string, string>>;
}

function resolveDataSourceValue(
  source: DataSource,
  resolveField: (path: string) => unknown,
): string | null {
  if (source.type === "static") {
    const value = source.value.trim();
    return value.length > 0 ? value : null;
  }

  const raw = resolveField(source.path);
  if (raw == null) {
    return null;
  }

  const value = String(raw).trim();
  return value.length > 0 ? value : null;
}

function isExternalUrl(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function isValidClickHref(href: string): boolean {
  if (isExternalUrl(href)) {
    return true;
  }

  return href.startsWith("/app/");
}

function readRecordId(item: Record<string, unknown>): string | undefined {
  const recordId = item.id;
  if (recordId == null) {
    return undefined;
  }

  const id = String(recordId).trim();
  return id.length > 0 ? id : undefined;
}

function resolveRelationTargetEntity(
  definition: SerializableEntityDefinition,
  relationFieldPath: string,
  getDefinition?: RelationDefinitionLookup,
): { readonly fkField: string; readonly targetEntity: string } | null {
  const trimmed = relationFieldPath.trim();
  if (!trimmed) {
    return null;
  }

  const directMeta = definition.fields[trimmed];
  if (
    directMeta?.relation &&
    (directMeta.relation.type === "many-to-one" ||
      directMeta.relation.type === "one-to-one")
  ) {
    return { fkField: trimmed, targetEntity: directMeta.relation.target };
  }

  const resolvedFk = resolveRelationFieldName(definition, trimmed);
  if (resolvedFk) {
    const meta = definition.fields[resolvedFk];
    if (meta?.relation?.target) {
      return { fkField: resolvedFk, targetEntity: meta.relation.target };
    }
  }

  const parsed = parseRelationFieldPath(definition, trimmed, getDefinition);
  if (
    parsed &&
    (parsed.relationKind === "many-to-one" ||
      parsed.relationKind === "one-to-one")
  ) {
    const meta = definition.fields[parsed.relationField];
    if (meta?.relation?.target) {
      return {
        fkField: parsed.relationField,
        targetEntity: meta.relation.target,
      };
    }
  }

  if (trimmed.includes(".")) {
    const root = trimmed.split(".")[0] ?? trimmed;
    if (root !== trimmed) {
      return resolveRelationTargetEntity(definition, root, getDefinition);
    }
  }

  return null;
}

function resolveOneToManyRelationEntity(
  definition: SerializableEntityDefinition,
  relationFieldPath: string,
  getDefinition?: RelationDefinitionLookup,
): {
  readonly relationField: string;
  readonly targetEntity: string;
} | null {
  const trimmed = relationFieldPath.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = parseRelationFieldPath(definition, trimmed, getDefinition);
  if (parsed?.relationKind === "one-to-many") {
    const meta = definition.fields[parsed.relationField];
    const targetEntity = meta?.relation?.target;
    if (targetEntity) {
      return { relationField: parsed.relationField, targetEntity };
    }
  }

  const directMeta = definition.fields[trimmed];
  if (
    directMeta?.relation?.type === "one-to-many" &&
    directMeta.relation.target
  ) {
    return { relationField: trimmed, targetEntity: directMeta.relation.target };
  }

  if (trimmed.includes(".")) {
    const root = trimmed.split(".")[0] ?? trimmed;
    if (root !== trimmed) {
      return resolveOneToManyRelationEntity(definition, root, getDefinition);
    }
  }

  return null;
}

function resolveEntityNavigationScope(options: {
  readonly target: EntityNavigationTarget;
  readonly item: Record<string, unknown>;
  readonly entityName: string;
  readonly definition: SerializableEntityDefinition;
  readonly getDefinition?: RelationDefinitionLookup;
  readonly hints?: { readonly boundFieldPath?: string };
}): ResolvedEntityNavigationScope | null {
  if (options.target.scope === "current") {
    return {
      entityName: options.entityName,
      recordId: readRecordId(options.item),
    };
  }

  if (options.target.scope === "entity") {
    const entityName = options.target.entityName.trim();
    return entityName.length > 0 ? { entityName } : null;
  }

  const relationFieldPath =
    options.target.relationFieldPath.trim() ||
    options.hints?.boundFieldPath?.trim() ||
    "";
  if (!relationFieldPath) {
    return null;
  }

  const m2o = resolveRelationTargetEntity(
    options.definition,
    relationFieldPath,
    options.getDefinition,
  );
  if (m2o) {
    const rawId = options.item[m2o.fkField];
    const recordId =
      typeof rawId === "string" && rawId.trim().length > 0
        ? rawId.trim()
        : undefined;

    return {
      entityName: m2o.targetEntity,
      recordId,
    };
  }

  const o2m = resolveOneToManyRelationEntity(
    options.definition,
    relationFieldPath,
    options.getDefinition,
  );
  if (!o2m) {
    return null;
  }

  const relationMeta = options.definition.fields[o2m.relationField];
  const parentId = readRecordId(options.item);
  const childDefinition = options.getDefinition?.(o2m.targetEntity);
  const relationInverse =
    relationMeta?.relation &&
    "inverse" in relationMeta.relation &&
    typeof relationMeta.relation.inverse === "string"
      ? relationMeta.relation.inverse
      : undefined;
  const prefill =
    parentId && childDefinition
      ? (() => {
          const fkField = resolveOneToManyForeignKeyField(
            options.entityName,
            childDefinition,
            relationInverse ? { inverse: relationInverse } : undefined,
          );
          return fkField ? { [fkField]: parentId } : undefined;
        })()
      : undefined;

  return {
    entityName: o2m.targetEntity,
    prefill,
  };
}

function resolveRecordDetailHref(
  scope: ResolvedEntityNavigationScope,
  linkState: EntityReturnToState | undefined,
): ResolvedComponentClickTarget | null {
  if (!scope.recordId) {
    return null;
  }

  return {
    href: `/app/${scope.entityName}/${scope.recordId}`,
    external: false,
    state: linkState,
  };
}

function resolveRecordEditHref(
  scope: ResolvedEntityNavigationScope,
  returnTo: string | undefined,
): ResolvedComponentClickTarget | null {
  if (!scope.recordId) {
    return null;
  }

  return {
    href: buildEntityListEditPath(
      scope.entityName,
      scope.recordId,
      returnTo ?? buildEntityListPath(scope.entityName),
    ),
    external: false,
  };
}

function resolveEntityListHref(
  scope: ResolvedEntityNavigationScope,
  linkState: EntityReturnToState | undefined,
): ResolvedComponentClickTarget {
  return {
    href: buildEntityListPath(scope.entityName),
    external: false,
    state: linkState,
  };
}

function resolveEntityCreateHref(
  scope: ResolvedEntityNavigationScope,
  returnTo: string | undefined,
): ResolvedComponentClickTarget {
  return {
    href: buildEntityListCreatePath(
      scope.entityName,
      returnTo ?? buildEntityListPath(scope.entityName),
      scope.prefill,
    ),
    external: false,
  };
}

function resolveEntityViewTarget(
  view: EntityViewKind,
  scope: ResolvedEntityNavigationScope | null,
  linkState: EntityReturnToState | undefined,
  returnTo: string | undefined,
): ResolvedComponentClickTarget | null {
  if (!scope) {
    return null;
  }

  switch (view) {
    case "recordDetail":
      return resolveRecordDetailHref(scope, linkState);
    case "recordEditForm":
      return resolveRecordEditHref(scope, returnTo);
    case "entityList":
      return resolveEntityListHref(scope, linkState);
  }
}

export function resolveComponentClickTarget(options: {
  readonly action: ComponentClickAction;
  readonly item: Record<string, unknown>;
  readonly entityName: string;
  readonly definition: SerializableEntityDefinition;
  readonly resolveField: (path: string) => unknown;
  readonly getDefinition?: RelationDefinitionLookup;
  readonly returnTo?: string;
  readonly hints?: { readonly boundFieldPath?: string };
}): ResolvedComponentClickTarget | null {
  const linkState: EntityReturnToState | undefined = options.returnTo
    ? { returnTo: options.returnTo }
    : undefined;

  if (options.action.type === "entityRecord") {
    const legacyTarget: EntityNavigationTarget =
      options.action.target === "current"
        ? { scope: "current" }
        : {
            scope: "relation",
            relationFieldPath: options.action.target.relationFieldPath,
          };

    return resolveEntityViewTarget(
      "recordDetail",
      resolveEntityNavigationScope({
        target: legacyTarget,
        item: options.item,
        entityName: options.entityName,
        definition: options.definition,
        getDefinition: options.getDefinition,
        hints: options.hints,
      }),
      linkState,
      options.returnTo,
    );
  }

  if (options.action.type === "entityView") {
    return resolveEntityViewTarget(
      options.action.view,
      resolveEntityNavigationScope({
        target: options.action.target,
        item: options.item,
        entityName: options.entityName,
        definition: options.definition,
        getDefinition: options.getDefinition,
        hints: options.hints,
      }),
      linkState,
      options.returnTo,
    );
  }

  if (options.action.type === "entityCreateForm") {
    if (options.action.target.scope === "current") {
      return null;
    }

    const scope = resolveEntityNavigationScope({
      target: options.action.target,
      item: options.item,
      entityName: options.entityName,
      definition: options.definition,
      getDefinition: options.getDefinition,
      hints: options.hints,
    });

    if (!scope) {
      return null;
    }

    return resolveEntityCreateHref(scope, options.returnTo);
  }

  if (options.action.type !== "externalUrl") {
    return null;
  }

  const href = resolveDataSourceValue(options.action.url, options.resolveField);
  if (!href || !isValidClickHref(href)) {
    return null;
  }

  const external = isExternalUrl(href);
  return {
    href,
    external,
    openInNewTab: options.action.openInNewTab ?? external,
  };
}
