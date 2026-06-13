import type {
  EntityUIConfig,
  MetricWidgetDefinition,
  TableViewConfig,
  ViewConfig,
} from "./types.js";
import { metricStripHasContent } from "./metric-strip-placement.js";
import {
  createEmptyColumn,
  createEmptyLayout,
  createLayoutId,
  type ColumnNode,
  type ComponentRowNode,
  type NestedLayoutRowNode,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

/** Legacy persisted table view shape (stripped on read via migration). */
export type LegacyTableViewConfig = TableViewConfig & {
  readonly metricStripLayout?: UiLayoutDocument;
};

function readLegacyMetricStripLayout(
  views: EntityUIConfig["views"],
): UiLayoutDocument | undefined {
  const tableView = views.find((view) => view.type === "table") as
    | LegacyTableViewConfig
    | undefined;
  return tableView?.metricStripLayout;
}

function ensureWidgetNestedLayoutRoot(
  layout: UiLayoutDocument,
): UiLayoutDocument {
  const rootColumn = layout.root.columns[0];
  if (
    layout.root.columns.length === 1 &&
    rootColumn?.rows.length === 1 &&
    rootColumn.rows[0]?.type === "nested-layout"
  ) {
    return layout;
  }

  const rowsToWrap =
    layout.root.columns.length === 1
      ? (rootColumn?.rows ?? [])
      : layout.root.columns.flatMap((column) => column.rows);
  const baseColumn = rootColumn ?? createEmptyColumn();
  const nestedRow: NestedLayoutRowNode = {
    type: "nested-layout",
    id: createLayoutId("nested"),
    columnCount: 1,
    columns: [
      {
        ...createEmptyColumn(),
        rows: [...rowsToWrap],
        stackDirection: baseColumn.stackDirection ?? "column",
        styles: baseColumn.styles,
        widthPercent: baseColumn.widthPercent,
        displayFrom: baseColumn.displayFrom,
        displayTo: baseColumn.displayTo,
      },
    ],
    styles: layout.root.styles,
  };

  return {
    ...layout,
    root: {
      ...layout.root,
      columnCount: 1,
      styles: undefined,
      columns: [
        {
          ...baseColumn,
          rows: [nestedRow],
          stackDirection: undefined,
          styles: undefined,
          widthPercent: undefined,
          displayFrom: undefined,
          displayTo: undefined,
        },
      ],
    },
  };
}

function buildMetricRowLayout(
  entityName: string,
  widgets: readonly MetricWidgetDefinition[],
): UiLayoutDocument {
  const columnCount = Math.max(1, widgets.length);
  const layout = createEmptyLayout(columnCount);
  const nestedColumns: ColumnNode[] = widgets.map((widget) => ({
    ...createEmptyColumn(),
    rows: [
      {
        type: "component",
        id: createLayoutId("row"),
        component: {
          kind: "metric-widget",
          entityName,
          widgetId: widget.id,
        },
      } satisfies ComponentRowNode,
    ],
  }));

  if (widgets.length === 0) {
    return ensureMetricsRowNestedLayoutRoot(layout);
  }

  const nestedRow: NestedLayoutRowNode = {
    type: "nested-layout",
    id: createLayoutId("nested"),
    columnCount: nestedColumns.length,
    columns: nestedColumns,
  };

  const rootColumn = layout.root.columns[0] ?? createEmptyColumn();
  return ensureMetricsRowNestedLayoutRoot({
    ...layout,
    root: {
      ...layout.root,
      columnCount: 1,
      columns: [
        {
          ...rootColumn,
          rows: [nestedRow],
        },
      ],
    },
  });
}

function ensureMetricsRowNestedLayoutRoot(
  layout: UiLayoutDocument,
): UiLayoutDocument {
  const rootColumn = layout.root.columns[0];
  if (
    layout.root.columns.length === 1 &&
    rootColumn?.rows.length === 1 &&
    rootColumn.rows[0]?.type === "nested-layout"
  ) {
    return layout;
  }

  const rowsToWrap =
    layout.root.columns.length === 1
      ? (rootColumn?.rows ?? [])
      : layout.root.columns.flatMap((column) => column.rows);
  const baseColumn = rootColumn ?? createEmptyColumn();
  const nestedRow: NestedLayoutRowNode = {
    type: "nested-layout",
    id: createLayoutId("nested"),
    columnCount: 1,
    columns: [
      {
        ...createEmptyColumn(),
        rows: [...rowsToWrap],
        stackDirection: baseColumn.stackDirection ?? "column",
        styles: baseColumn.styles,
        widthPercent: baseColumn.widthPercent,
        displayFrom: baseColumn.displayFrom,
        displayTo: baseColumn.displayTo,
      },
    ],
    styles: layout.root.styles,
  };

  return {
    ...layout,
    root: {
      ...layout.root,
      columnCount: 1,
      styles: undefined,
      columns: [
        {
          ...baseColumn,
          rows: [nestedRow],
          stackDirection: undefined,
          styles: undefined,
          widthPercent: undefined,
          displayFrom: undefined,
          displayTo: undefined,
        },
      ],
    },
  };
}

function stripMetricStripLayoutFromViews(
  views: EntityUIConfig["views"],
): EntityUIConfig["views"] {
  return views.map((view) => {
    if (view.type !== "table") {
      return view;
    }

    const legacyView = view as LegacyTableViewConfig;
    if (!legacyView.metricStripLayout) {
      return view;
    }

    const rest = { ...legacyView };
    delete rest.metricStripLayout;
    return rest as ViewConfig;
  });
}

function buildWidgetsFromStrip(
  stripLayout: UiLayoutDocument,
): MetricWidgetDefinition[] {
  const columnsWithContent = stripLayout.root.columns.filter(
    (column) => column.rows.length > 0,
  );

  const widgets: MetricWidgetDefinition[] = [];

  for (const [index, column] of columnsWithContent.entries()) {
    const widgetLayout = ensureWidgetNestedLayoutRoot({
      root: {
        ...stripLayout.root,
        columnCount: 1,
        columns: [
          {
            ...column,
            id: createLayoutId("col"),
          },
        ],
      },
    });

    widgets.push({
      id: createLayoutId("widget"),
      name: `Column ${index + 1}`,
      layout: widgetLayout,
    });
  }

  return widgets;
}

export interface MigrateMetricStripResult {
  readonly metricWidgets: readonly MetricWidgetDefinition[];
  readonly metricRowLayout?: UiLayoutDocument;
}

export function migrateMetricStripToMetricsRow(
  ui: EntityUIConfig,
  entityName: string,
): EntityUIConfig {
  const viewsWithoutStrip = stripMetricStripLayoutFromViews(ui.views);
  const stripLayout = readLegacyMetricStripLayout(ui.views);

  if (ui.metricRowLayout && metricStripHasContent(ui.metricRowLayout)) {
    return {
      ...ui,
      views: viewsWithoutStrip,
    };
  }

  if (!stripLayout || !metricStripHasContent(stripLayout)) {
    return {
      ...ui,
      views: viewsWithoutStrip,
    };
  }

  const existingWidgets = ui.metricWidgets ?? [];
  const migratedWidgets = buildWidgetsFromStrip(stripLayout);
  const metricWidgets = [...existingWidgets, ...migratedWidgets];
  const metricRowLayout = buildMetricRowLayout(entityName, migratedWidgets);

  return {
    ...ui,
    views: viewsWithoutStrip,
    metricWidgets,
    metricRowLayout,
  };
}
