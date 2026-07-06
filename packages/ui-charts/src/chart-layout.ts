import type {
  ChartAxisOptions,
  ChartLegendOptions,
  ChartLegendPosition,
} from "./types.js";

export interface ChartInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

const AXIS_LABEL_HEIGHT = 14;
const AXIS_TICK_HEIGHT = 8;
const LEGEND_ITEM_HEIGHT = 18;
const LEGEND_PADDING = 4;

function legendHeight(legend: ChartLegendOptions | undefined): number {
  if (!legend?.visible || legend.position === "none") {
    return 0;
  }
  if (legend.position === "left" || legend.position === "right") {
    return 0;
  }
  return LEGEND_ITEM_HEIGHT + LEGEND_PADDING * 2;
}

function legendWidth(legend: ChartLegendOptions | undefined): number {
  if (!legend?.visible || legend.position === "none") {
    return 0;
  }
  if (legend.position === "top" || legend.position === "bottom") {
    return 0;
  }
  return 72;
}

function axisInset(
  axis: ChartAxisOptions | undefined,
  side: "x" | "y",
): number {
  if (!axis?.visible) {
    return 0;
  }
  const tick = axis.showTicks ? AXIS_TICK_HEIGHT : 0;
  const label = axis.label ? AXIS_LABEL_HEIGHT : 0;
  if (side === "x") {
    return tick + label + 4;
  }
  return tick + label + 28;
}

export function resolveChartInsets(
  legend: ChartLegendOptions | undefined,
  xAxis: ChartAxisOptions | undefined,
  yAxis: ChartAxisOptions | undefined,
): ChartInsets {
  const position: ChartLegendPosition = legend?.position ?? "none";
  const legendTop =
    legend?.visible && position === "top" ? legendHeight(legend) : 0;
  const legendBottom =
    legend?.visible && position === "bottom" ? legendHeight(legend) : 0;
  const legendLeft =
    legend?.visible && position === "left" ? legendWidth(legend) : 0;
  const legendRight =
    legend?.visible && position === "right" ? legendWidth(legend) : 0;

  return {
    top: legendTop,
    right: legendRight,
    bottom: axisInset(xAxis, "x") + legendBottom,
    left: axisInset(yAxis, "y") + legendLeft,
  };
}

export function resolveLegendFontWeight(
  fontWeight: ChartLegendOptions["fontWeight"],
): number | undefined {
  switch (fontWeight) {
    case "normal":
      return 400;
    case "medium":
      return 500;
    case "semibold":
      return 600;
    case "bold":
      return 700;
    default:
      return undefined;
  }
}
