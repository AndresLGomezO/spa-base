import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ExpandableTableViewConfig,
  GroupedTableColumn,
  UiLayoutDocument,
  ViewConfig,
} from "@repo/entities";
import {
  createDefaultExpandableTableView,
  createDefaultUiLayout,
} from "@repo/entities";
import { useQueryClient } from "@tanstack/react-query";

import type { EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { putEntityUiOverride } from "../../lib/api-client";
import { patchEntityCatalogAfterUiOverrideSave } from "./patch-entity-catalog-after-ui-override-save";

type ListPresentationType = "table" | "card" | "expandableTable";

function getDefaultFieldPaths(
  definition: ReturnType<typeof useEntityDefinition>,
) {
  return Object.keys(definition.fields).filter(
    (field) => definition.fields[field]?.type !== "document",
  );
}

function resolvePresentationType(
  listViewType: string | undefined,
): ListPresentationType {
  if (listViewType === "card") {
    return "card";
  }
  if (listViewType === "expandableTable" || listViewType === "compact") {
    return "expandableTable";
  }
  return "table";
}

export function useEntityListLayoutEditor(entityName: EntityName) {
  const definition = useEntityDefinition(entityName);
  const queryClient = useQueryClient();
  const fieldPaths = useMemo(
    () => getDefaultFieldPaths(definition),
    [definition],
  );
  const uiViews = definition.ui.views;
  const listViewType = definition.ui.listViewType;

  const [viewType, setViewType] = useState<ListPresentationType>("table");
  const [tableFields, setTableFields] = useState<readonly string[]>(fieldPaths);
  const [tableShowActions, setTableShowActions] = useState(true);
  const [expandableColumns, setExpandableColumns] = useState<
    readonly GroupedTableColumn[]
  >(() => createDefaultExpandableTableView(fieldPaths).columns);
  const [rowExpandLayout, setRowExpandLayout] = useState<UiLayoutDocument>(
    () => createDefaultExpandableTableView(fieldPaths).rowExpandLayout,
  );
  const [expandableShowActions, setExpandableShowActions] = useState(true);
  const [layout, setLayout] = useState<UiLayoutDocument>(() =>
    createDefaultUiLayout(fieldPaths),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [layoutEditorKey, setLayoutEditorKey] = useState(0);

  const filterFieldOptions = useMemo(() => [...fieldPaths], [fieldPaths]);
  const defaultFieldPath = fieldPaths[0] ?? "name";

  useEffect(() => {
    const tableView = uiViews.find((view) => view.type === "table");
    const cardView = uiViews.find((view) => view.type === "card");
    const expandableView = uiViews.find(
      (view) => view.type === "expandableTable",
    ) as ExpandableTableViewConfig | undefined;

    setViewType(resolvePresentationType(listViewType));
    setTableFields(
      tableView && tableView.fields.length > 0
        ? [...tableView.fields]
        : fieldPaths,
    );
    setTableShowActions(
      tableView?.type === "table" ? tableView.showActions !== false : true,
    );

    if (expandableView) {
      setExpandableColumns([...expandableView.columns]);
      setRowExpandLayout(expandableView.rowExpandLayout);
      setExpandableShowActions(expandableView.showActions !== false);
    } else {
      const defaults = createDefaultExpandableTableView(fieldPaths);
      setExpandableColumns(defaults.columns);
      setRowExpandLayout(defaults.rowExpandLayout);
      setExpandableShowActions(true);
    }

    const listItem = definition.ui.listItem ?? cardView?.layout;
    if (listItem) {
      setLayout(listItem);
      setLayoutEditorKey((current) => current + 1);
      return;
    }

    setLayout(createDefaultUiLayout(fieldPaths));
    setLayoutEditorKey((current) => current + 1);
  }, [definition.ui.listItem, fieldPaths, listViewType, uiViews]);

  const buildExpandableTableView = useCallback(
    (existing?: ExpandableTableViewConfig): ExpandableTableViewConfig => ({
      ...(existing ?? {
        type: "expandableTable",
        name: "expandable",
        fields: fieldPaths,
      }),
      type: "expandableTable",
      name: existing?.name ?? "expandable",
      fields:
        existing?.fields && existing.fields.length > 0
          ? existing.fields
          : fieldPaths,
      columns:
        expandableColumns.length > 0
          ? expandableColumns
          : createDefaultExpandableTableView(fieldPaths).columns,
      rowExpandLayout,
      showActions: expandableShowActions,
      ...(existing?.filters ? { filters: existing.filters } : {}),
      ...(existing?.defaultSort ? { defaultSort: existing.defaultSort } : {}),
    }),
    [expandableColumns, expandableShowActions, fieldPaths, rowExpandLayout],
  );

  const buildViews = useCallback((): readonly ViewConfig[] => {
    const tableView = uiViews.find((view) => view.type === "table");
    const expandableView = uiViews.find(
      (view) => view.type === "expandableTable",
    ) as ExpandableTableViewConfig | undefined;
    const resolvedTableFields =
      tableFields.length > 0 ? tableFields : fieldPaths;

    const tableViewConfig: ViewConfig = {
      ...(tableView ?? { type: "table", name: "default", fields: fieldPaths }),
      type: "table",
      name: tableView?.name ?? "default",
      fields: resolvedTableFields,
      showActions: tableShowActions,
      ...(tableView?.type === "table" && tableView.metricStripLayout
        ? { metricStripLayout: tableView.metricStripLayout }
        : {}),
      ...(tableView?.type === "table" && tableView.filters
        ? { filters: tableView.filters }
        : {}),
      ...(tableView?.type === "table" && tableView.defaultSort
        ? { defaultSort: tableView.defaultSort }
        : {}),
    };

    const expandableViewConfig = buildExpandableTableView(expandableView);

    if (viewType === "table") {
      return [tableViewConfig, expandableViewConfig];
    }

    if (viewType === "expandableTable") {
      return [tableViewConfig, expandableViewConfig];
    }

    const cardViewConfig: ViewConfig = {
      type: "card",
      name: "card",
      fields: fieldPaths,
      layout,
    };

    return [tableViewConfig, expandableViewConfig, cardViewConfig];
  }, [
    buildExpandableTableView,
    fieldPaths,
    layout,
    tableFields,
    tableShowActions,
    uiViews,
    viewType,
  ]);

  const save = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      const payload: Parameters<typeof putEntityUiOverride>[1] = {
        views: buildViews(),
        listViewType: viewType,
      };
      const existingListItem =
        definition.ui.listItem ??
        uiViews.find((view) => view.type === "card")?.layout;
      const { override } =
        viewType === "card"
          ? await putEntityUiOverride(entityName, {
              ...payload,
              listItem: layout,
            })
          : await putEntityUiOverride(entityName, {
              ...payload,
              ...(existingListItem ? { listItem: existingListItem } : {}),
            });

      patchEntityCatalogAfterUiOverrideSave(queryClient, entityName, override);
      return true;
    } catch {
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    buildViews,
    definition.ui.listItem,
    entityName,
    layout,
    queryClient,
    uiViews,
    viewType,
  ]);

  return {
    entityName,
    definition,
    fieldPaths,
    filterFieldOptions,
    defaultFieldPath,
    viewType,
    setViewType,
    tableFields,
    setTableFields,
    tableShowActions,
    setTableShowActions,
    expandableColumns,
    setExpandableColumns,
    rowExpandLayout,
    setRowExpandLayout,
    expandableShowActions,
    setExpandableShowActions,
    layout,
    setLayout,
    isSaving,
    save,
    layoutEditorKey,
  };
}

export type UseEntityListLayoutEditorResult = ReturnType<
  typeof useEntityListLayoutEditor
>;
