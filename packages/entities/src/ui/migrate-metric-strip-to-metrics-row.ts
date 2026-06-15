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
  ensureContainerRoot,
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

function ensureWidgetContainerRoot(layout: UiLayoutDocument): UiLayoutDocument {
  return ensureContainerRoot(layout);
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
    return ensureContainerRoot(layout);
  }

  const nestedRow: NestedLayoutRowNode = {
    type: "nested-layout",
    id: createLayoutId("nested"),
    columnCount: nestedColumns.length,
    columns: nestedColumns,
  };

  const rootColumn = layout.root.columns[0] ?? createEmptyColumn();
  return ensureContainerRoot({
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
    const widgetLayout = ensureWidgetContainerRoot({
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
