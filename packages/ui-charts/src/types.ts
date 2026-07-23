export type ChartRenderType = "line" | "area" | "donut";

export interface ChartRenderPoint {
  readonly x: string | number;
  readonly y: number;
  readonly seriesId?: string;
}

export interface ChartRenderSeries {
  readonly id: string;
  readonly label: string;
  readonly points: readonly ChartRenderPoint[];
  readonly color?: string;
  readonly strokeWidth?: number;
  readonly showAreaFill?: boolean;
  readonly areaFillColor?: string;
  readonly areaFillOpacity?: number;
}

export type ChartLegendPosition = "top" | "bottom" | "left" | "right" | "none";

export type ChartLegendAlign = "start" | "center" | "end";

export interface ChartLegendOptions {
  readonly visible?: boolean;
  readonly position?: ChartLegendPosition;
  readonly align?: ChartLegendAlign;
  readonly fontSize?: number;
  readonly fontWeight?: "normal" | "medium" | "semibold" | "bold";
}

export interface ChartAxisOptions {
  readonly visible?: boolean;
  readonly label?: string;
  readonly showTicks?: boolean;
}

export interface ChartGridOptions {
  readonly visible?: boolean;
}

export interface ChartAnimationOptions {
  readonly enabled?: boolean;
  readonly durationMs?: number;
}

export interface LineAreaChartProps {
  readonly chartType: Extract<ChartRenderType, "line" | "area">;
  readonly series: readonly ChartRenderSeries[];
  readonly xAxis?: ChartAxisOptions;
  readonly yAxis?: ChartAxisOptions;
  readonly legend?: ChartLegendOptions;
  readonly grid?: ChartGridOptions;
  readonly animation?: ChartAnimationOptions;
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly loading?: boolean;
  readonly loadingLabel?: string;
  readonly emptyMessage?: string;
}

export interface DonutChartProps {
  readonly value: number;
  readonly maxValue?: number;
  readonly fillColor?: string;
  readonly trackColor?: string;
  readonly innerRadiusRatio?: number;
  readonly centerLabel?: string;
  readonly showCenterLabel?: boolean;
  readonly strokeWidth?: number;
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly loading?: boolean;
  readonly loadingLabel?: string;
  readonly emptyMessage?: string;
}
