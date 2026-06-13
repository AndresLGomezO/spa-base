export const METRICS_ROW_DESIGNER_TAB_IDS = ["widgets", "row"] as const;

export type MetricsRowDesignerTabId =
  (typeof METRICS_ROW_DESIGNER_TAB_IDS)[number];

export const METRICS_ROW_DESIGNER_TAB_SEARCH_PARAM = "tab";

export function isMetricsRowDesignerTabId(
  value: string,
): value is MetricsRowDesignerTabId {
  return (METRICS_ROW_DESIGNER_TAB_IDS as readonly string[]).includes(value);
}

export function parseMetricsRowDesignerTabId(
  value: string | null,
): MetricsRowDesignerTabId {
  if (value && isMetricsRowDesignerTabId(value)) {
    return value;
  }
  return "widgets";
}
