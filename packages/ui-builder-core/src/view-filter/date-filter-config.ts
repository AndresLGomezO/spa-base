import type {
  ViewFilterComponentConfig,
  ViewFilterDateGranularity,
} from "../types/component.js";

export type { ViewFilterDateGranularity };

export interface DashboardDateFilterConfig {
  readonly param: string;
  readonly granularity: ViewFilterDateGranularity;
}

export function defaultDateFilterParam(
  granularity: ViewFilterDateGranularity,
): string {
  switch (granularity) {
    case "year":
      return "year";
    case "month":
      return "month";
    case "day":
      return "date";
  }
}

export function resolveDateFilterGranularity(
  config: Pick<ViewFilterComponentConfig, "dateFilterGranularity">,
): ViewFilterDateGranularity {
  return config.dateFilterGranularity ?? "month";
}

export function resolveDateFilterParam(
  config: Pick<
    ViewFilterComponentConfig,
    "dateFilterGranularity" | "dateFilterParam"
  >,
): string {
  const trimmed = config.dateFilterParam?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }

  return defaultDateFilterParam(resolveDateFilterGranularity(config));
}

export function resolveDashboardDateFilterConfig(
  config: ViewFilterComponentConfig,
): DashboardDateFilterConfig | null {
  if (config.enableDateFilter !== true) {
    return null;
  }

  const granularity = resolveDateFilterGranularity(config);
  return {
    param: resolveDateFilterParam(config),
    granularity,
  };
}
