import type { UiLayoutDocument } from "@repo/ui-builder-core";

import {
  createComponentsLayoutBinding,
  type ComponentsLayoutBinding,
} from "../form-designer/form-designer-components-layout";
import type { UseEntityMetricsWidgetsEditorResult } from "../ui-builder/use-entity-metrics-widgets-editor";
import type { MetricsRowPanelSession } from "./metrics-row-designer-panel-session";
import type { MetricsRowDesignerTabId } from "./metrics-row-designer-tabs";

function resolveSelectedWidgetLayout(
  editor: Pick<
    UseEntityMetricsWidgetsEditorResult,
    "selectedWidget" | "widgets"
  >,
): UiLayoutDocument | null {
  const layout = editor.selectedWidget?.layout;
  if (layout) {
    return layout;
  }

  return editor.widgets[0]?.layout ?? null;
}

function readWidgetsLayoutSnapshot(
  editor: Pick<
    UseEntityMetricsWidgetsEditorResult,
    "selectedWidget" | "widgets"
  >,
): UiLayoutDocument {
  const layout = resolveSelectedWidgetLayout(editor);
  if (!layout) {
    throw new Error("Metrics row designer requires a selected widget layout.");
  }

  return structuredClone(layout);
}

function readRowLayoutSnapshot(
  editor: Pick<UseEntityMetricsWidgetsEditorResult, "metricRowLayout">,
): UiLayoutDocument {
  return structuredClone(editor.metricRowLayout);
}

export function readPanelLayoutSnapshot(
  editor: Pick<
    UseEntityMetricsWidgetsEditorResult,
    "metricRowLayout" | "selectedWidget" | "widgets"
  >,
  activeTabId: MetricsRowDesignerTabId,
): UiLayoutDocument {
  if (activeTabId === "row") {
    return readRowLayoutSnapshot(editor);
  }

  return readWidgetsLayoutSnapshot(editor);
}

export function applyPanelSessionSnapshot(
  editor: Pick<
    UseEntityMetricsWidgetsEditorResult,
    "setMetricRowLayout" | "updateSelectedWidgetLayout"
  >,
  session: Pick<MetricsRowPanelSession, "baseline">,
  activeTabId: MetricsRowDesignerTabId,
): void {
  const snapshot = structuredClone(session.baseline);
  if (activeTabId === "row") {
    editor.setMetricRowLayout(snapshot);
    return;
  }

  editor.updateSelectedWidgetLayout(snapshot);
}

export function resolveWidgetsLayoutBinding(
  editor: Pick<
    UseEntityMetricsWidgetsEditorResult,
    | "selectedWidget"
    | "selectedWidgetId"
    | "widgets"
    | "updateSelectedWidgetLayout"
  >,
): ComponentsLayoutBinding {
  const layout = resolveSelectedWidgetLayout(editor);
  const widgetId =
    editor.selectedWidget?.id ??
    editor.widgets[0]?.id ??
    editor.selectedWidgetId;

  if (!layout || !widgetId) {
    throw new Error("Metrics row designer requires a selected widget layout.");
  }

  return createComponentsLayoutBinding(layout, (next) => {
    editor.updateSelectedWidgetLayout(next);
  });
}

export function resolveRowLayoutBinding(
  editor: Pick<
    UseEntityMetricsWidgetsEditorResult,
    "metricRowLayout" | "setMetricRowLayout"
  >,
): ComponentsLayoutBinding {
  return createComponentsLayoutBinding(editor.metricRowLayout, (next) => {
    editor.setMetricRowLayout(next);
  });
}

export function resolveActiveLayoutBinding(
  editor: Pick<
    UseEntityMetricsWidgetsEditorResult,
    | "metricRowLayout"
    | "selectedWidget"
    | "selectedWidgetId"
    | "setMetricRowLayout"
    | "widgets"
    | "updateSelectedWidgetLayout"
  >,
  activeTabId: MetricsRowDesignerTabId,
): ComponentsLayoutBinding {
  if (activeTabId === "row") {
    return resolveRowLayoutBinding(editor);
  }

  return resolveWidgetsLayoutBinding(editor);
}
