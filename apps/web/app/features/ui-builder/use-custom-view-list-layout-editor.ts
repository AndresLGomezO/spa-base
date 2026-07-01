import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DesignLayoutSliceData,
  ExpandableTableViewConfig,
  GroupedTableColumn,
  ListSliceData,
  UiLayoutDocument,
  ViewConfig,
} from "@repo/entities";
import { createDefaultExpandableTableView } from "@repo/entities";
import {
  createDefaultListCardLayout,
  ensureListCardContainerRootLayout,
  ensureRowExpandContainerRootLayout,
} from "@repo/ui-builder-core";
import { buildCustomViewUiPatch } from "../../custom-views/build-custom-view-ui-patch";
import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { patchCustomView } from "../../lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useCustomViewLayoutEditorContext } from "./resolve-custom-view-layout-editor-context";

const EMPTY_VIEWS: readonly ViewConfig[] = [];

function getDefaultFieldPaths(definition: EntityCatalogEntry) {
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

type ListPresentationType = "table" | "card" | "expandableTable";

export function useCustomViewListLayoutEditor(viewId?: string) {
  const { customView, entityName, definition } =
    useCustomViewLayoutEditorContext(viewId);
  const queryClient = useQueryClient();
  const fieldPaths = useMemo(
    () => (definition ? getDefaultFieldPaths(definition) : []),
    [definition],
  );
  const uiViews = useMemo(
    () => definition?.ui.views ?? EMPTY_VIEWS,
    [definition?.ui.views],
  );
  const listViewType = definition?.ui.listViewType;

  const [viewType, setViewType] = useState<ListPresentationType>("table");
  const [tableFields, setTableFields] = useState<readonly string[]>(fieldPaths);
  const [tableShowActions, setTableShowActions] = useState(true);
  const [expandableColumns, setExpandableColumns] = useState<
    readonly GroupedTableColumn[]
  >(() => createDefaultExpandableTableView(fieldPaths).columns);
  const [rowExpandLayout, setRowExpandLayout] = useState<UiLayoutDocument>(() =>
    ensureRowExpandContainerRootLayout(
      createDefaultExpandableTableView(fieldPaths).rowExpandLayout,
      fieldPaths,
    ),
  );
  const [expandableShowActions, setExpandableShowActions] = useState(true);
  const [layout, setLayout] = useState<UiLayoutDocument>(() =>
    createDefaultListCardLayout(fieldPaths),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [layoutEditorKey, setLayoutEditorKey] = useState(0);

  const filterFieldOptions = useMemo(() => [...fieldPaths], [fieldPaths]);
  const defaultFieldPath = fieldPaths[0] ?? "name";

  useEffect(() => {
    if (!definition) {
      return;
    }
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
      setRowExpandLayout(
        ensureRowExpandContainerRootLayout(
          expandableView.rowExpandLayout,
          fieldPaths,
        ),
      );
      setExpandableShowActions(expandableView.showActions !== false);
    } else {
      const defaults = createDefaultExpandableTableView(fieldPaths);
      setExpandableColumns(defaults.columns);
      setRowExpandLayout(
        ensureRowExpandContainerRootLayout(
          defaults.rowExpandLayout,
          fieldPaths,
        ),
      );
      setExpandableShowActions(true);
    }

    const listItem = definition.ui.listItem ?? cardView?.layout;
    if (listItem) {
      setLayout(ensureListCardContainerRootLayout(listItem, fieldPaths));
      setLayoutEditorKey((current) => current + 1);
      return;
    }

    setLayout(createDefaultListCardLayout(fieldPaths));
    setLayoutEditorKey((current) => current + 1);
  }, [definition, fieldPaths, listViewType, uiViews]);

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
    if (!customView || !definition) {
      return false;
    }
    setIsSaving(true);
    try {
      const existingListItem =
        definition.ui.listItem ??
        uiViews.find((view) => view.type === "card")?.layout;
      await patchCustomView(
        customView.id,
        buildCustomViewUiPatch(
          viewType === "card"
            ? {
                views: [...buildViews()],
                listViewType: viewType,
                listItem: layout,
              }
            : {
                views: [...buildViews()],
                listViewType: viewType,
                ...(existingListItem ? { listItem: existingListItem } : {}),
              },
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ["custom-views"] });
      return true;
    } catch {
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    buildViews,
    customView,
    definition,
    layout,
    queryClient,
    uiViews,
    viewType,
  ]);

  const exportSlice = useCallback((): ListSliceData => {
    return {
      listViewType: viewType,
      table: {
        fields: tableFields.length > 0 ? [...tableFields] : [...fieldPaths],
        showActions: tableShowActions,
      },
      expandableTable: {
        columns: [...expandableColumns],
        rowExpandLayout,
        showActions: expandableShowActions,
      },
      ...(viewType === "card" ? { listItem: layout } : {}),
    };
  }, [
    expandableColumns,
    expandableShowActions,
    fieldPaths,
    layout,
    rowExpandLayout,
    tableFields,
    tableShowActions,
    viewType,
  ]);

  const applySlice = useCallback(
    (data: DesignLayoutSliceData) => {
      const listData = data as ListSliceData;
      const nextViewType =
        listData.listViewType === "compact"
          ? "expandableTable"
          : listData.listViewType;
      setViewType(nextViewType);
      setTableFields([...listData.table.fields]);
      setTableShowActions(listData.table.showActions !== false);
      setExpandableColumns([...listData.expandableTable.columns]);
      setRowExpandLayout(
        ensureRowExpandContainerRootLayout(
          listData.expandableTable.rowExpandLayout,
          fieldPaths,
        ),
      );
      setExpandableShowActions(listData.expandableTable.showActions !== false);
      if (listData.listItem) {
        setLayout(
          ensureListCardContainerRootLayout(listData.listItem, fieldPaths),
        );
      }
      setLayoutEditorKey((current) => current + 1);
    },
    [fieldPaths],
  );

  return {
    viewId,
    customView,
    entityName,
    definition: definition as EntityCatalogEntry,
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
    exportSlice,
    applySlice,
  };
}
