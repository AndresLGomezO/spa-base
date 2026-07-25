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
  resolveListBuiltinTemplateId,
  type BuiltInComponentTemplateId,
} from "@repo/ui-builder-core";
import { useQueryClient } from "@tanstack/react-query";

import type { EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { putEntityUiOverride } from "../../lib/api-client";
import { patchEntityCatalogAfterUiOverrideSave } from "./patch-entity-catalog-after-ui-override-save";
import type { LayoutPresetId } from "./use-layout-system-preset-catalog";
import { selectionToPresetValue } from "./use-layout-system-preset-catalog";

export type ListPresentationType = "card" | "expandableTable";

function getDefaultFieldPaths(
  definition: ReturnType<typeof useEntityDefinition>,
) {
  return Object.keys(definition.fields).filter(
    (field) => definition.fields[field]?.type !== "document",
  );
}

function buildDefaultExpandableTable(
  definition: ReturnType<typeof useEntityDefinition>,
  fieldPaths: readonly string[],
) {
  const fieldLabels = Object.fromEntries(
    Object.entries(definition.ui.fields ?? {}).map(([name, config]) => [
      name,
      config?.label,
    ]),
  );
  return createDefaultExpandableTableView(fieldPaths, {
    fields: definition.fields,
    fieldLabels,
  });
}

function resolvePresentationType(
  listViewType: string | undefined,
): ListPresentationType {
  if (listViewType === "card") {
    return "card";
  }
  return "expandableTable";
}

function resolveInitialPresentation(
  listViewType: string | undefined,
  layout: UiLayoutDocument,
): ListPresentationType {
  const derived = deriveListPresentationFromLayout(layout);
  if (derived === "card") {
    return "card";
  }
  return resolvePresentationType(listViewType);
}

function createDefaultExpandableLayout(
  fieldPaths: readonly string[],
): UiLayoutDocument {
  return applyBuiltInTemplate("expandable-table-list", { fieldPaths });
}

export function resolveListLayoutPresetId(
  layout: UiLayoutDocument,
  listViewType?: string,
): LayoutPresetId {
  return resolveListBuiltinTemplateId(layout, listViewType);
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
  const defaultExpandableView = useMemo(
    () => buildDefaultExpandableTable(definition, fieldPaths),
    [definition, fieldPaths],
  );

  const [viewType, setViewTypeState] =
    useState<ListPresentationType>("expandableTable");
  const [layoutPresetId, setLayoutPresetId] = useState<LayoutPresetId>(
    "expandable-table-list",
  );
  const [tableFields, setTableFields] = useState<readonly string[]>(fieldPaths);
  const [tableShowActions, setTableShowActions] = useState(true);
  const [expandableColumns, setExpandableColumns] = useState<
    readonly GroupedTableColumn[]
  >(() => defaultExpandableView.columns);
  const [expandableShowActions, setExpandableShowActions] = useState(true);
  /** `undefined` inherits detail summaryField; `""` hides; otherwise field path. */
  const [expandableSummaryField, setExpandableSummaryField] = useState<
    string | undefined
  >(undefined);
  const [layout, setLayout] = useState<UiLayoutDocument>(() =>
    createDefaultExpandableLayout(fieldPaths),
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
      setExpandableSummaryField(
        expandableView.summaryField !== undefined
          ? expandableView.summaryField
          : undefined,
      );
    } else {
      const defaults = buildDefaultExpandableTable(definition, fieldPaths);
      setExpandableColumns(defaults.columns);
      setExpandableShowActions(true);
      setExpandableSummaryField(undefined);
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

    const expandableLayout = createDefaultExpandableLayout(fieldPaths);
    setViewTypeState("expandableTable");
    setLayoutPresetId("expandable-table-list");
    setLayout(expandableLayout);
    setLayoutEditorKey((current) => current + 1);
  }, [definition, definition.ui.listItem, fieldPaths, listViewType, uiViews]);

  const buildExpandableTableView = useCallback(
    (existing?: ExpandableTableViewConfig): ExpandableTableViewConfig => {
      const existingSource = existing ?? {
        type: "expandableTable" as const,
        name: "expandable",
        fields: fieldPaths,
        columns: [] as ExpandableTableViewConfig["columns"],
        rowExpandLayout: layout,
      };
      const { summaryField: _ignoredSummaryField, ...existingWithoutSummary } =
        existingSource;
      void _ignoredSummaryField;

      return {
        ...existingWithoutSummary,
        type: "expandableTable",
        name: existing?.name ?? "expandable",
        fields:
          existing?.fields && existing.fields.length > 0
            ? existing.fields
            : fieldPaths,
        columns:
          expandableColumns.length > 0
            ? expandableColumns
            : buildDefaultExpandableTable(definition, fieldPaths).columns,
        rowExpandLayout: layout,
        showActions: expandableShowActions,
        ...(expandableSummaryField !== undefined
          ? { summaryField: expandableSummaryField }
          : {}),
        ...(existing?.imageFieldPath
          ? { imageFieldPath: existing.imageFieldPath }
          : defaultExpandableView.imageFieldPath
            ? { imageFieldPath: defaultExpandableView.imageFieldPath }
            : {}),
        ...(existing?.filters ? { filters: existing.filters } : {}),
        ...(existing?.defaultSort ? { defaultSort: existing.defaultSort } : {}),
      };
    },
    [
      defaultExpandableView.imageFieldPath,
      definition,
      expandableColumns,
      expandableShowActions,
      expandableSummaryField,
      fieldPaths,
      layout,
    ],
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

    return [tableViewConfig, buildExpandableTableView(expandableView)];
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
        listItem: layout,
      };

      const { override } = await putEntityUiOverride(entityName, payload);

      patchEntityCatalogAfterUiOverrideSave(queryClient, entityName, override);
      return true;
    } catch {
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [buildViews, entityName, layout, queryClient, viewType]);

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
        ...(expandableSummaryField !== undefined
          ? { summaryField: expandableSummaryField }
          : {}),
      },
      listItem: layout,
    };
  }, [
    expandableColumns,
    expandableShowActions,
    expandableSummaryField,
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
    setExpandableSummaryField(
      listData.expandableTable.summaryField !== undefined
        ? listData.expandableTable.summaryField
        : undefined,
    );
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
    entityName,
    definition,
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
    expandableSummaryField,
    setExpandableSummaryField,
    layout,
    setLayout,
    isSaving,
    save,
    layoutEditorKey,
    exportSlice,
    applySlice,
  };
}

export type UseEntityListLayoutEditorResult = ReturnType<
  typeof useEntityListLayoutEditor
>;
