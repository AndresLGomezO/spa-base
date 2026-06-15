import type { MetricWidgetDefinition } from "@repo/entities";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

import { ensureContainerRoot } from "@repo/ui-builder-core";

import { createDefaultMetricRowLayout } from "../ui-builder/create-default-metric-row-layout";
import type { UseEntityMetricsWidgetsEditorResult } from "../ui-builder/use-entity-metrics-widgets-editor";

export interface MetricsRowDesignerWidgetsSnapshot {
  readonly widgets: readonly MetricWidgetDefinition[];
}

export interface MetricsRowDesignerRowLayoutSnapshot {
  readonly metricRowLayout: UiLayoutDocument;
}

function normalizeWidgets(
  widgets: readonly MetricWidgetDefinition[],
): MetricWidgetDefinition[] {
  return widgets.map((widget) => ({
    ...widget,
    layout: ensureContainerRoot(widget.layout),
  }));
}

export function readWidgetsSnapshot(
  editor: Pick<UseEntityMetricsWidgetsEditorResult, "widgets">,
): MetricsRowDesignerWidgetsSnapshot {
  return {
    widgets: structuredClone(normalizeWidgets(editor.widgets)),
  };
}

export function readWidgetsSnapshotFromDefinition(
  definition: UseEntityMetricsWidgetsEditorResult["definition"],
): MetricsRowDesignerWidgetsSnapshot {
  const source = definition.ui.metricWidgets ?? [];

  return {
    widgets: structuredClone(source.length > 0 ? normalizeWidgets(source) : []),
  };
}

export function areWidgetsSnapshotsEqual(
  left: MetricsRowDesignerWidgetsSnapshot,
  right: MetricsRowDesignerWidgetsSnapshot,
): boolean {
  return JSON.stringify(left.widgets) === JSON.stringify(right.widgets);
}

export function applyWidgetsSnapshotToEditor(
  editor: Pick<UseEntityMetricsWidgetsEditorResult, "setWidgets">,
  snapshot: MetricsRowDesignerWidgetsSnapshot,
): void {
  editor.setWidgets(structuredClone(snapshot.widgets));
}

function normalizeMetricRowLayout(layout: UiLayoutDocument): UiLayoutDocument {
  return ensureContainerRoot(layout);
}

function defaultMetricRowLayout(): UiLayoutDocument {
  return createDefaultMetricRowLayout();
}

export function readRowLayoutSnapshot(
  editor: Pick<UseEntityMetricsWidgetsEditorResult, "metricRowLayout">,
): MetricsRowDesignerRowLayoutSnapshot {
  return {
    metricRowLayout: structuredClone(
      normalizeMetricRowLayout(editor.metricRowLayout),
    ),
  };
}

export function readRowLayoutSnapshotFromDefinition(
  definition: UseEntityMetricsWidgetsEditorResult["definition"],
): MetricsRowDesignerRowLayoutSnapshot {
  const source = definition.ui.metricRowLayout;

  return {
    metricRowLayout: structuredClone(
      source ? normalizeMetricRowLayout(source) : defaultMetricRowLayout(),
    ),
  };
}

export function areRowLayoutSnapshotsEqual(
  left: MetricsRowDesignerRowLayoutSnapshot,
  right: MetricsRowDesignerRowLayoutSnapshot,
): boolean {
  return (
    JSON.stringify(left.metricRowLayout) ===
    JSON.stringify(right.metricRowLayout)
  );
}

export function applyRowLayoutSnapshotToEditor(
  editor: Pick<UseEntityMetricsWidgetsEditorResult, "setMetricRowLayout">,
  snapshot: MetricsRowDesignerRowLayoutSnapshot,
): void {
  editor.setMetricRowLayout(structuredClone(snapshot.metricRowLayout));
}
