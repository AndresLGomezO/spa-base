import type { EntityName } from "../../entities/entity-catalog";
import { buildDesignLayoutLocation } from "./design-layout-search-params";
import type { DesignLayoutEntityKind } from "./design-layout-kind";

export type DesignLayoutTargetKind = "entity" | "customView";

export interface DesignLayoutTarget {
  readonly kind: DesignLayoutTargetKind;
  readonly entityName?: EntityName;
  readonly customViewId?: string;
}

const ENTITY_TARGET_PREFIX = "entity:";
const CUSTOM_VIEW_TARGET_PREFIX = "customView:";

export function encodeDesignLayoutTarget(target: DesignLayoutTarget): string {
  if (target.kind === "customView" && target.customViewId) {
    return `${CUSTOM_VIEW_TARGET_PREFIX}${target.customViewId}`;
  }

  return `${ENTITY_TARGET_PREFIX}${target.entityName ?? ""}`;
}

export function decodeDesignLayoutTarget(
  value: string,
): DesignLayoutTarget | null {
  if (value.startsWith(CUSTOM_VIEW_TARGET_PREFIX)) {
    const customViewId = value.slice(CUSTOM_VIEW_TARGET_PREFIX.length);
    return customViewId ? { kind: "customView", customViewId } : null;
  }

  if (value.startsWith(ENTITY_TARGET_PREFIX)) {
    const entityName = value.slice(ENTITY_TARGET_PREFIX.length);
    return entityName
      ? { kind: "entity", entityName: entityName as EntityName }
      : null;
  }

  return null;
}

export function getCurrentDesignLayoutTargetValue(
  entityName: EntityName,
  customViewId?: string,
): string {
  if (customViewId) {
    return encodeDesignLayoutTarget({ kind: "customView", customViewId });
  }

  return encodeDesignLayoutTarget({ kind: "entity", entityName });
}

export function designLayoutTargetPath(
  kind: DesignLayoutEntityKind,
  target: DesignLayoutTarget,
  existingSearch?: string,
): string | null {
  if (target.kind === "customView" && target.customViewId) {
    if (kind !== "main" && kind !== "list" && kind !== "metrics") {
      return null;
    }

    return buildDesignLayoutLocation(kind, target, existingSearch);
  }

  if (target.kind === "entity" && target.entityName) {
    return buildDesignLayoutLocation(kind, target, existingSearch);
  }

  return null;
}
