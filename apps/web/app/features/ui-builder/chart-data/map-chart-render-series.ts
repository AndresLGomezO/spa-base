import type { ChartPoint, ChartSeriesStyle } from "@repo/ui-builder-core";
import type { ChartRenderSeries } from "@repo/ui-charts";

export function mapStaticPointsToRenderSeries(
  points: readonly ChartPoint[],
  seriesStyles: readonly ChartSeriesStyle[] | undefined,
  defaultSeriesId = "default",
): readonly ChartRenderSeries[] {
  const style =
    seriesStyles?.find((entry) => entry.id === defaultSeriesId) ??
    seriesStyles?.[0];

  return [
    {
      id: style?.id ?? defaultSeriesId,
      label: style?.label ?? "Series",
      points: points.map((point) => ({
        x: point.x,
        y: point.y,
        seriesId: point.seriesId,
      })),
      color: style?.color,
      strokeWidth: style?.strokeWidth,
      showAreaFill: style?.showAreaFill,
      areaFillColor: style?.areaFillColor,
      areaFillOpacity: style?.areaFillOpacity,
    },
  ];
}

export function groupPointsBySeries(
  points: readonly ChartPoint[],
  seriesStyles: readonly ChartSeriesStyle[] | undefined,
): readonly ChartRenderSeries[] {
  const grouped = new Map<string, ChartPoint[]>();

  for (const point of points) {
    const seriesId = point.seriesId ?? "default";
    const bucket = grouped.get(seriesId);
    if (bucket) {
      bucket.push(point);
    } else {
      grouped.set(seriesId, [point]);
    }
  }

  return [...grouped.entries()].map(([seriesId, seriesPoints]) => {
    const style = seriesStyles?.find((entry) => entry.id === seriesId);
    return {
      id: seriesId,
      label: style?.label ?? seriesId,
      points: seriesPoints.map((point) => ({
        x: point.x,
        y: point.y,
        seriesId: point.seriesId,
      })),
      color: style?.color,
      strokeWidth: style?.strokeWidth,
      showAreaFill: style?.showAreaFill,
      areaFillColor: style?.areaFillColor,
      areaFillOpacity: style?.areaFillOpacity,
    };
  });
}

const PREVIEW_CHART_POINTS: readonly ChartPoint[] = [
  { x: "Jan", y: 12 },
  { x: "Feb", y: 18 },
  { x: "Mar", y: 15 },
  { x: "Apr", y: 22 },
  { x: "May", y: 28 },
  { x: "Jun", y: 24 },
];

export function resolvePreviewChartSeries(
  seriesStyles: readonly ChartSeriesStyle[] | undefined,
): readonly ChartRenderSeries[] {
  return mapStaticPointsToRenderSeries(PREVIEW_CHART_POINTS, seriesStyles);
}
