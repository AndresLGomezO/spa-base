const CHART_GLOW_FILTER_COUNT = 4;

export function resolveChartGlowStrokeColor(
  seriesIndex: number,
  fallbackColor: string,
): string {
  const slot = seriesIndex + 1;
  return `var(--color-chart-glow-${slot}, var(--color-chart-${slot}, ${fallbackColor}))`;
}

export function resolveChartGlowFilterId(
  instanceId: string,
  seriesIndex: number,
): string {
  return `chart-glow-${instanceId}-${seriesIndex}`;
}

export interface ChartGlowFiltersProps {
  readonly instanceId: string;
  readonly seriesCount: number;
}

export function ChartGlowFilters({
  instanceId,
  seriesCount,
}: ChartGlowFiltersProps) {
  const count = Math.min(Math.max(seriesCount, 0), CHART_GLOW_FILTER_COUNT);

  return (
    <defs>
      {Array.from({ length: count }, (_, index) => {
        const filterId = resolveChartGlowFilterId(instanceId, index);
        return (
          <filter
            key={filterId}
            id={filterId}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feGaussianBlur in="blur" stdDeviation="4" result="wideBlur" />
            <feMerge>
              <feMergeNode in="wideBlur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        );
      })}
    </defs>
  );
}
