import type { FieldAccessLevel } from "@repo/entities";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";
import type { SerializableEntityDefinition } from "@repo/entities";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { getFieldAccessLevel } from "../../hooks/useFieldAccess";
import { createComponentClickContextHelpers } from "./create-component-click-context-helpers.js";
import { createEntityLayoutRenderContext } from "./create-entity-layout-render-context.js";

export function createEntityRecordRenderContext(options: {
  readonly item: Record<string, unknown>;
  readonly definition: SerializableEntityDefinition;
  readonly locale: string;
  readonly fieldAccess?: Readonly<Record<string, FieldAccessLevel>>;
  readonly getDefinition?: (
    entityName: string,
  ) => EntityCatalogEntry | undefined;
  readonly usePreviewSamples?: boolean;
  readonly returnTo?: string;
}): LayoutRenderContext {
  const base = createEntityLayoutRenderContext({
    ...options,
    usePreviewSamples: options.usePreviewSamples,
    usePreviewPlaceholder: true,
  });

  const resolveField = base.resolveField;

  return {
    ...base,
    mode: "detail",
    fieldAccessFilter: (fieldPath) => {
      const root = fieldPath.includes(".")
        ? (fieldPath.split(".")[0] ?? fieldPath)
        : fieldPath;
      if (!options.fieldAccess) {
        return true;
      }
      return getFieldAccessLevel(options.fieldAccess, root) !== "none";
    },
    ...createComponentClickContextHelpers({
      item: options.item,
      entityName: options.definition.name,
      definition: options.definition,
      resolveField,
      getDefinition: options.getDefinition,
      returnTo: options.returnTo,
    }),
  };
}
