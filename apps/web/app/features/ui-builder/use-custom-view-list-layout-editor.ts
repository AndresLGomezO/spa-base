import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DesignLayoutSliceData,
  ExpandableTableViewConfig,
  GroupedTableColumn,
  ListSliceData,
  UiBuilderPresetRecord,
  UiLayoutDocument,
  ViewConfig,
} from "@repo/entities";
import { createDefaultExpandableTableView } from "@repo/entities";
import {
  applyBuiltInTemplate,
  deriveListPresentationFromLayout,
  ensureContainerRoot,
  resolveBuiltInTemplatePresentation,
  type BuiltInComponentTemplateId,
} from "@repo/ui-builder-core";
import { buildCustomViewUiPatch } from "../../custom-views/build-custom-view-ui-patch";
import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { patchCustomView } from "../../lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useCustomViewLayoutEditorContext } from "./resolve-custom-view-layout-editor-context";
import type { LayoutPresetId } from "./use-layout-system-preset-catalog";
import { selectionToPresetValue } from "./use-layout-system-preset-catalog";
import {
  resolveListLayoutPresetId,
  type ListPresentationType,
} from "./use-entity-list-layout-editor";

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

function resolveInitialPresentation(
  listViewType: string | undefined,
  layout: UiLayoutDocument,
): ListPresentationType {
  const derived = deriveListPresentationFromLayout(layout);
  if (derived !== "table") {
    return derived;
  }
  return resolvePresentationType(listViewType);
}

function createPlainTableLayout(
  fieldPaths: readonly string[],
): UiLayoutDocument {
  return applyBuiltInTemplate("plain-table-list", { fieldPaths });
}

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

  const [viewType, setViewTypeState] = useState<ListPresentationType>("table");
  const [layoutPresetId, setLayoutPresetId] =
    useState<LayoutPresetId>("plain-table-list");
  const [tableFields, setTableFields] = useState<readonly string[]>(fieldPaths);
  const [tableShowActions, setTableShowActions] = useState(true);
  const [expandableColumns, setExpandableColumns] = useState<
    readonly GroupedTableColumn[]
  >(() => createDefaultExpandableTableView(fieldPaths).columns);
  const [expandableShowActions, setExpandableShowActions] = useState(true);
  const [layout, setLayout] = useState<UiLayoutDocument>(() =>
    createPlainTableLayout(fieldPaths),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [layoutEditorKey, setLayoutEditorKey] = useState(0);

  const filterFieldOptions = useMemo(() => [...fieldPaths], [fieldPaths]);
  const defaultFieldPath = fieldPaths[0] ?? "name";

  const applyListSystemPreset = useCallback(
    (
      input:
        | {
            readonly source: "builtin";
            readonly id: BuiltInComponentTemplateId;
          }
        | {
            readonly source: "tenant";
            readonly preset: UiBuilderPresetRecord;
            readonly layout: UiLayoutDocument;
          },
    ) => {
      const nextLayout =
        input.source === "builtin"
          ? ensureContainerRoot(applyBuiltInTemplate(input.id, { fieldPaths }))
          : ensureContainerRoot(input.layout);

      setLayout(nextLayout);

      const presentation =
        input.source === "builtin"
          ? (resolveBuiltInTemplatePresentation(input.id) ??
            deriveListPresentationFromLayout(nextLayout))
          : deriveListPresentationFromLayout(nextLayout);

      setViewTypeState(presentation);
      setLayoutPresetId(
        input.source === "builtin"
          ? input.id
          : selectionToPresetValue({ source: "tenant", id: input.preset.id }),
      );
      setLayoutEditorKey((current) => current + 1);
    },
    [fieldPaths],
  );

  useEffect(() => {
    if (!definition) {
      return;
    }
    const tableView = uiViews.find((view) => view.type === "table");
    const expandableView = uiViews.find(
      (view) => view.type === "expandableTable",
    ) as ExpandableTableViewConfig | undefined;

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
      setExpandableShowActions(expandableView.showActions !== false);
    } else {
      const defaults = createDefaultExpandableTableView(fieldPaths);
      setExpandableColumns(defaults.columns);
      setExpandableShowActions(true);
    }

    const listItem =
      definition.ui.listItem ??
      uiViews.find((view) => view.type === "card")?.layout ??
      expandableView?.rowExpandLayout;

    if (listItem) {
      const normalized = ensureContainerRoot(listItem);
      const nextViewType = resolveInitialPresentation(listViewType, normalized);
      setLayout(normalized);
      setViewTypeState(nextViewType);
      setLayoutPresetId(resolveListLayoutPresetId(normalized, listViewType));
      setLayoutEditorKey((current) => current + 1);
      return;
    }

    const plainLayout = createPlainTableLayout(fieldPaths);
    setViewTypeState("table");
    setLayoutPresetId("plain-table-list");
    setLayout(plainLayout);
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
      rowExpandLayout: layout,
      showActions: expandableShowActions,
      ...(existing?.filters ? { filters: existing.filters } : {}),
      ...(existing?.defaultSort ? { defaultSort: existing.defaultSort } : {}),
    }),
    [expandableColumns, expandableShowActions, fieldPaths, layout],
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

    if (viewType === "card") {
      const cardViewConfig: ViewConfig = {
        type: "card",
        name: "card",
        fields: fieldPaths,
        layout,
      };
      return [tableViewConfig, cardViewConfig];
    }

    if (viewType === "expandableTable") {
      return [tableViewConfig, buildExpandableTableView(expandableView)];
    }

    return [tableViewConfig];
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
      await patchCustomView(
        customView.id,
        buildCustomViewUiPatch({
          views: [...buildViews()],
          listViewType: viewType,
          listItem: layout,
        }),
      );
      await queryClient.invalidateQueries({ queryKey: ["custom-views"] });
      return true;
    } catch {
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [buildViews, customView, definition, layout, queryClient, viewType]);

  const exportSlice = useCallback((): ListSliceData => {
    return {
      listViewType: viewType,
      table: {
        fields: tableFields.length > 0 ? [...tableFields] : [...fieldPaths],
        showActions: tableShowActions,
      },
      expandableTable: {
        columns: [...expandableColumns],
        rowExpandLayout: layout,
        showActions: expandableShowActions,
      },
      listItem: layout,
    };
  }, [
    expandableColumns,
    expandableShowActions,
    fieldPaths,
    layout,
    tableFields,
    tableShowActions,
    viewType,
  ]);

  const applySlice = useCallback((data: DesignLayoutSliceData) => {
    const listData = data as ListSliceData;
    const nextViewType =
      listData.listViewType === "compact"
        ? "expandableTable"
        : listData.listViewType;
    setViewTypeState(nextViewType);
    setTableFields([...listData.table.fields]);
    setTableShowActions(listData.table.showActions !== false);
    setExpandableColumns([...listData.expandableTable.columns]);
    setExpandableShowActions(listData.expandableTable.showActions !== false);
    const nextLayout = ensureContainerRoot(
      listData.listItem ?? listData.expandableTable.rowExpandLayout,
    );
    setLayout(nextLayout);
    setLayoutPresetId(
      resolveListLayoutPresetId(nextLayout, listData.listViewType),
    );
    setLayoutEditorKey((current) => current + 1);
  }, []);

  return {
    viewId,
    customView,
    entityName,
    definition: definition as EntityCatalogEntry,
    fieldPaths,
    filterFieldOptions,
    defaultFieldPath,
    viewType,
    layoutPresetId,
    applyListSystemPreset,
    tableFields,
    setTableFields,
    tableShowActions,
    setTableShowActions,
    expandableColumns,
    setExpandableColumns,
    rowExpandLayout: layout,
    setRowExpandLayout: setLayout,
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
