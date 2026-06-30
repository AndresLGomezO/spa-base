import type { ComponentClickAction, DataSource } from "@repo/ui-builder-core";
import type { SerializableEntityDefinition } from "@repo/entities";

import {
  parseRelationFieldPath,
  resolveRelationFieldName,
  type RelationDefinitionLookup,
} from "../../components/entity/resolve-relation-field-path";
import type { EntityReturnToState } from "../../routing/entity-navigation";

export interface ResolvedComponentClickTarget {
  readonly href: string;
  readonly external: boolean;
  readonly openInNewTab?: boolean;
  readonly state?: unknown;
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
    if (options.action.target === "current") {
      const recordId = options.item.id;
      if (recordId == null) {
        return null;
      }

      const id = String(recordId).trim();
      if (!id) {
        return null;
      }

      return {
        href: `/app/${options.entityName}/${id}`,
        external: false,
        state: linkState,
      };
    }

    const relationFieldPath =
      options.action.target.relationFieldPath.trim() ||
      options.hints?.boundFieldPath?.trim() ||
      "";
    if (!relationFieldPath) {
      return null;
    }

    const resolved = resolveRelationTargetEntity(
      options.definition,
      relationFieldPath,
      options.getDefinition,
    );
    if (!resolved) {
      return null;
    }

    const rawId = options.item[resolved.fkField];
    if (typeof rawId !== "string" || !rawId) {
      return null;
    }

    return {
      href: `/app/${resolved.targetEntity}/${rawId}`,
      external: false,
      state: linkState,
    };
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
