import type { EntityName } from "../../entities/entity-catalog";
import type { DesignLayoutTarget } from "./design-layout-target";
import type { DesignLayoutEntityKind } from "./design-layout-kind";
import { designLayoutKindPath } from "./design-layout-paths";

const DESIGN_LAYOUT_ENTITY_SEARCH_PARAM = "entity";
const DESIGN_LAYOUT_CUSTOM_VIEW_SEARCH_PARAM = "customView";

export function readDesignLayoutSearchTarget(search: string): {
  readonly entityName: EntityName | null;
  readonly customViewId: string | null;
  readonly hasTarget: boolean;
} {
  const params = new URLSearchParams(search);
  const entityName = params.get(
    DESIGN_LAYOUT_ENTITY_SEARCH_PARAM,
  ) as EntityName | null;
  const customViewId = params.get(DESIGN_LAYOUT_CUSTOM_VIEW_SEARCH_PARAM);

  return {
    entityName,
    customViewId,
    hasTarget: Boolean(entityName || customViewId),
  };
}

export function buildDesignLayoutLocation(
  kind: DesignLayoutEntityKind,
  target: DesignLayoutTarget,
  existingSearch?: string,
): string {
  const params = new URLSearchParams(existingSearch);
  params.delete(DESIGN_LAYOUT_ENTITY_SEARCH_PARAM);
  params.delete(DESIGN_LAYOUT_CUSTOM_VIEW_SEARCH_PARAM);

  if (target.kind === "customView" && target.customViewId) {
    params.set(DESIGN_LAYOUT_CUSTOM_VIEW_SEARCH_PARAM, target.customViewId);
  } else if (target.kind === "entity" && target.entityName) {
    params.set(DESIGN_LAYOUT_ENTITY_SEARCH_PARAM, target.entityName);
  }

  const query = params.toString();
  const basePath = designLayoutKindPath(kind);
  return query ? `${basePath}?${query}` : basePath;
}

export function buildDesignLayoutFormDesignLocation(
  entityName: string,
  formDesignId: string,
  existingSearch?: string,
): string {
  const params = new URLSearchParams(existingSearch);
  params.set(DESIGN_LAYOUT_ENTITY_SEARCH_PARAM, entityName);
  params.delete(DESIGN_LAYOUT_CUSTOM_VIEW_SEARCH_PARAM);

  const query = params.toString();
  const path = `/settings/design-layout/forms/${formDesignId}`;
  return query ? `${path}?${query}` : path;
}

export function buildLegacyDesignLayoutEntityRedirectLocation(
  kind: DesignLayoutEntityKind,
  entityName: string,
  existingSearch?: string,
): string {
  return buildDesignLayoutLocation(
    kind,
    { kind: "entity", entityName: entityName as EntityName },
    existingSearch,
  );
}

export function buildLegacyDesignLayoutCustomViewRedirectLocation(
  kind: Extract<DesignLayoutEntityKind, "main" | "list" | "metrics">,
  customViewId: string,
  existingSearch?: string,
): string {
  return buildDesignLayoutLocation(
    kind,
    { kind: "customView", customViewId },
    existingSearch,
  );
}

export function buildLegacyDesignLayoutFormDesignRedirectLocation(
  entityName: string,
  formDesignId: string,
  existingSearch?: string,
): string {
  return buildDesignLayoutFormDesignLocation(
    entityName,
    formDesignId,
    existingSearch,
  );
}
