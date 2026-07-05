import type { SerializableEntityDefinition } from "@repo/entities";
import {
  isQueryViewerComponent,
  resolveComponentBoundFieldPath,
  type ComponentRowNode,
  type DesignSurface,
  type UiLayoutDocument,
  resolveLayoutRootColumns,
} from "@repo/ui-builder-core";
import {
  ComponentRowClickActionEditor,
  type CatalogEntityOption,
} from "@repo/ui-builder-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { FieldDescriptor } from "@repo/ui-builder-react";

import {
  getEntityLabel,
  type EntityCatalogEntry,
} from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import type { EntityQueryDefinitionRecord } from "../../lib/api-client";
import { listEntityQueryDefinitions } from "../../lib/api-client";
import { componentClickActionEditorLabels } from "./component-click-action-editor-labels.js";
import { resolveCreateFormTargetEntityName } from "./resolve-create-form-target-entity.js";
import { resolveQueryViewerSourceDefinition } from "./resolve-query-viewer-field-context.js";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref.js";
import type { ComponentsLayoutBinding } from "../form-designer/form-designer-components-layout.js";

const LIST_LIKE_SURFACES = new Set<DesignSurface>([
  "listItem",
  "tableColumnCell",
  "tableRowExpand",
  "metricStrip",
  "metricRow",
  "metricWidget",
  "dashboardSection",
  "dashboardLayout",
  "mainPage",
]);

function showsCurrentRecordClickTarget(surface: DesignSurface): boolean {
  return LIST_LIKE_SURFACES.has(surface);
}

function layoutHasQueryViewer(layout: UiLayoutDocument): boolean {
  for (const column of resolveLayoutRootColumns(layout)) {
    for (const layoutRow of column.rows) {
      if (
        layoutRow.type === "component" &&
        isQueryViewerComponent(layoutRow.component)
      ) {
        return true;
      }
    }
  }

  return false;
}

function findFirstQueryViewerSourceEntity(
  layout: UiLayoutDocument,
  queryDefinitions: readonly EntityQueryDefinitionRecord[],
  catalogItems: readonly EntityCatalogEntry[],
): string | undefined {
  for (const column of resolveLayoutRootColumns(layout)) {
    for (const layoutRow of column.rows) {
      if (
        layoutRow.type !== "component" ||
        !isQueryViewerComponent(layoutRow.component)
      ) {
        continue;
      }

      const definition = resolveQueryViewerSourceDefinition(
        layout,
        layoutRow.id,
        queryDefinitions,
        catalogItems,
      );
      if (definition) {
        return definition.name;
      }
    }
  }

  return undefined;
}

function buildCatalogEntityOptions(
  catalogItems: readonly EntityCatalogEntry[],
): readonly CatalogEntityOption[] {
  return catalogItems.map((entry) => ({
    entityName: entry.name,
    label: getEntityLabel(entry),
  }));
}

interface ComponentRowClickActionPanelSectionProps {
  readonly row: ComponentRowNode;
  readonly rowRef: ComponentRowRef;
  readonly binding: ComponentsLayoutBinding;
  readonly definition: SerializableEntityDefinition;
  readonly fieldDescriptors: readonly FieldDescriptor[];
  readonly designSurface: DesignSurface;
}

export function ComponentRowClickActionPanelSection({
  row,
  rowRef,
  binding,
  definition,
  fieldDescriptors,
  designSurface,
}: ComponentRowClickActionPanelSectionProps) {
  const { t } = useTranslation("common");
  const labels = useMemo(() => componentClickActionEditorLabels(t), [t]);
  const { items: catalogItems, getDefinition } = useEntityCatalog();
  const [queryDefinitions, setQueryDefinitions] = useState<
    readonly EntityQueryDefinitionRecord[]
  >([]);

  const needsQueryDefinitions = useMemo(
    () => layoutHasQueryViewer(binding.layout),
    [binding.layout],
  );

  useEffect(() => {
    if (!needsQueryDefinitions) {
      return;
    }

    let cancelled = false;

    async function loadQueryDefinitions() {
      try {
        const result = await listEntityQueryDefinitions();
        if (!cancelled) {
          setQueryDefinitions(result.items);
        }
      } catch {
        if (!cancelled) {
          setQueryDefinitions([]);
        }
      }
    }

    void loadQueryDefinitions();

    return () => {
      cancelled = true;
    };
  }, [needsQueryDefinitions]);

  const catalogEntities = useMemo(
    () => buildCatalogEntityOptions(catalogItems),
    [catalogItems],
  );

  const suggestedListEntityName = useMemo(() => {
    const fromEnclosing = resolveQueryViewerSourceDefinition(
      binding.layout,
      row.id,
      queryDefinitions,
      catalogItems,
    )?.name;

    if (fromEnclosing) {
      return fromEnclosing;
    }

    return findFirstQueryViewerSourceEntity(
      binding.layout,
      queryDefinitions,
      catalogItems,
    );
  }, [binding.layout, catalogItems, queryDefinitions, row.id]);

  const targetDefinition = useMemo(() => {
    if (
      row.clickAction?.type !== "entityCreateForm" ||
      row.clickAction.target.scope === "current"
    ) {
      return undefined;
    }

    const targetEntityName = resolveCreateFormTargetEntityName(
      row.clickAction.target,
      definition,
      (name) =>
        catalogItems.some((entry) => entry.name === name)
          ? getDefinition(name as never)
          : undefined,
    );

    return targetEntityName
      ? getDefinition(targetEntityName as never)
      : undefined;
  }, [catalogItems, definition, getDefinition, row.clickAction]);

  return (
    <ComponentRowClickActionEditor
      clickAction={row.clickAction}
      boundFieldPath={resolveComponentBoundFieldPath(row.component)}
      showCurrentRecordTarget={showsCurrentRecordClickTarget(designSurface)}
      showRecordTargets
      showListTargets={catalogEntities.length > 0}
      fieldDescriptors={fieldDescriptors}
      definition={definition}
      catalogEntities={catalogEntities}
      suggestedListEntityName={suggestedListEntityName}
      targetDefinition={targetDefinition}
      onChange={(clickAction) => binding.updateRowMeta(rowRef, { clickAction })}
      labels={labels}
    />
  );
}
