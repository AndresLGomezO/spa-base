export const METRICS_ROW_DESIGNER_WIDGET_SEARCH_PARAM = "widget";

export function getMetricsRowDesignerWidgetId(
  searchParams: URLSearchParams,
): string {
  return searchParams.get(METRICS_ROW_DESIGNER_WIDGET_SEARCH_PARAM)?.trim() ?? "";
}

export function applyWidgetSelectionToSearchParams(
  searchParams: URLSearchParams,
  widgetId: string,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  const trimmed = widgetId.trim();
  if (trimmed.length === 0) {
    next.delete(METRICS_ROW_DESIGNER_WIDGET_SEARCH_PARAM);
  } else {
    next.set(METRICS_ROW_DESIGNER_WIDGET_SEARCH_PARAM, trimmed);
  }
  return next;
}
