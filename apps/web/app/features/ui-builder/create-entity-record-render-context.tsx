import type { FieldAccessLevel } from "@repo/entities";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";
import type { SerializableEntityDefinition } from "@repo/entities";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { formatRecordDisplayLabel } from "../../components/entity/format-record-display-label";
import { getFieldAccessLevel } from "../../hooks/useFieldAccess";
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
}): LayoutRenderContext {
  const base = createEntityLayoutRenderContext({
    ...options,
    usePreviewSamples: options.usePreviewSamples,
  });

  const populated = (options.item._populated ?? {}) as Record<
    string,
    Record<string, unknown> | null
  >;

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
    resolveRecordFieldLink: (fieldPath) => {
      const root = fieldPath.includes(".")
        ? (fieldPath.split(".")[0] ?? fieldPath)
        : fieldPath;
      const meta = options.definition.fields[root];
      if (
        !meta?.relation ||
        (meta.relation.type !== "many-to-one" &&
          meta.relation.type !== "one-to-one")
      ) {
        return null;
      }
      const rawId = options.item[root];
      if (typeof rawId !== "string" || !rawId) {
        return null;
      }
      const target = populated[root];
      const label = target ? formatRecordDisplayLabel(target) : rawId;
      return {
        href: `/app/${meta.relation.target}/${rawId}`,
        label,
      };
    },
  };
}
