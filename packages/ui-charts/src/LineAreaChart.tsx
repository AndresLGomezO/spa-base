import { useMemo } from "react";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { curveMonotoneX } from "@visx/curve";
import { LinearGradient } from "@visx/gradient";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { AreaClosed, LinePath } from "@visx/shape";
import { scaleLinear, scalePoint } from "@visx/scale";
import { cn } from "@repo/theme/utils";

import { ChartContainer } from "./ChartContainer.js";
import { ChartLegend } from "./ChartLegend.js";
import { resolveChartInsets } from "./chart-layout.js";
import {
  resolveAreaFillGradientColor,
  resolveAreaFillGradientOpacity,
} from "./parse-chart-color.js";
import type { ChartRenderSeries, LineAreaChartProps } from "./types.js";

interface PreparedSeries {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly strokeWidth: number;
  readonly showAreaFill: boolean;
  readonly areaFillGradientRgb: string;
  readonly areaFillGradientOpacity: number;
  readonly points: Array<{ x: number; y: number }>;
  readonly xLabels: string[];
}

function toNumericX(value: string | number, index: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return index;
}

function prepareSeries(
  series: readonly ChartRenderSeries[],
  chartType: LineAreaChartProps["chartType"],
): PreparedSeries[] {
  const prepared: PreparedSeries[] = [];
  for (const entry of series) {
    const xLabels = entry.points.map((point, index) =>
      String(point.x ?? index),
    );
    const numericPoints = entry.points.map((point, index) => ({
      x: toNumericX(point.x, index),
      y: point.y,
    }));

    if (numericPoints.length === 0) {
      continue;
    }

    const strokeColor = entry.color ?? "var(--color-primary, #6366f1)";
    const areaFillColor =
      entry.areaFillColor ?? entry.color ?? "var(--color-primary, #6366f1)";
    const areaFillOpacity = entry.areaFillOpacity ?? 0.25;
    const parsedAreaFill = resolveAreaFillGradientColor(
      areaFillColor,
      strokeColor,
    );

    prepared.push({
      id: entry.id,
      label: entry.label,
      color: strokeColor,
      strokeWidth: entry.strokeWidth ?? 2,
      showAreaFill: chartType === "area" ? true : (entry.showAreaFill ?? false),
      areaFillGradientRgb: parsedAreaFill.rgb,
      areaFillGradientOpacity: resolveAreaFillGradientOpacity(
        parsedAreaFill,
        areaFillOpacity,
      ),
      points: numericPoints,
      xLabels,
    });
  }
  return prepared;
}

function resolvePointX(
  point: { readonly x: number },
  index: number,
  xLabels: readonly string[],
  innerWidth: number,
): number {
  const pointScale = scalePoint<string>({
    domain: [...xLabels],
    range: [0, innerWidth],
    padding: 0,
  });
  const label = xLabels[index];
  const band = pointScale(label);
  if (band !== undefined) {
    return band + pointScale.bandwidth() / 2;
  }

  const linearScale = scaleLinear<number>({
    domain: [0, Math.max(xLabels.length - 1, 1)],
    range: [0, innerWidth],
  });
  return linearScale(point.x);
}

function ChartSvg({
  width,
  height,
  preparedSeries,
  xAxis,
  yAxis,
  grid,
  animation,
}: {
  readonly width: number;
  readonly height: number;
  readonly preparedSeries: readonly PreparedSeries[];
  readonly xAxis: LineAreaChartProps["xAxis"];
  readonly yAxis: LineAreaChartProps["yAxis"];
  readonly grid: LineAreaChartProps["grid"];
  readonly animation: LineAreaChartProps["animation"];
}) {
  const primary = preparedSeries[0];
  const insets = resolveChartInsets(undefined, xAxis, yAxis);
  const innerWidth = Math.max(1, width - insets.left - insets.right);
  const innerHeight = Math.max(1, height - insets.top - insets.bottom);

  const allY = preparedSeries.flatMap((entry) =>
    entry.points.map((point) => point.y),
  );
  const yMin = Math.min(0, ...allY);
  const yMax = Math.max(...allY, 1);

  const yScale = scaleLinear<number>({
    domain: [yMin, yMax * 1.05],
    range: [innerHeight, 0],
    nice: true,
  });

  const xPointScale = useMemo(() => {
    if (!primary) {
      return scalePoint<string>({ domain: [], range: [0, innerWidth] });
    }
    return scalePoint<string>({
      domain: primary.xLabels,
      range: [0, innerWidth],
      padding: 0,
    });
  }, [innerWidth, primary]);

  const animationStyle =
    animation?.enabled === false
      ? undefined
      : {
          transition: `opacity ${animation?.durationMs ?? 600}ms ease-out`,
          opacity: 1,
        };

  if (!primary) {
    return null;
  }

  return (
    <svg width={width} height={height} className="block">
      <Group top={insets.top} left={insets.left}>
        {grid?.visible ? (
          <GridRows
            scale={yScale}
            width={innerWidth}
            stroke="var(--color-border, rgba(0,0,0,0.08))"
            strokeOpacity={0.8}
            numTicks={4}
          />
        ) : null}

        {preparedSeries.map((entry) => {
          const gradientId = `chart-area-gradient-${entry.id}`;
          const mapped = entry.points.map((point, index) => ({
            x: resolvePointX(point, index, entry.xLabels, innerWidth),
            y: yScale(point.y),
          }));

          return (
            <Group key={entry.id} style={animationStyle}>
              {entry.showAreaFill ? (
                <>
                  <LinearGradient
                    id={gradientId}
                    from={entry.areaFillGradientRgb}
                    to={entry.areaFillGradientRgb}
                    fromOpacity={entry.areaFillGradientOpacity}
                    toOpacity={0}
                    vertical
                  />
                  <AreaClosed
                    data={mapped}
                    x={(point) => point.x}
                    y={(point) => point.y}
                    yScale={yScale}
                    y0={() => innerHeight}
                    curve={curveMonotoneX}
                    fill={`url(#${gradientId})`}
                    stroke="none"
                  />
                </>
              ) : null}
              <LinePath
                data={mapped}
                x={(point) => point.x}
                y={(point) => point.y}
                stroke={entry.color}
                strokeWidth={entry.strokeWidth}
                curve={curveMonotoneX}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Group>
          );
        })}

        {yAxis?.visible ? (
          <AxisLeft
            scale={yScale}
            hideTicks={!yAxis.showTicks}
            hideAxisLine
            tickLabelProps={() => ({
              fill: "var(--color-muted-foreground, rgba(0,0,0,0.55))",
              fontSize: 10,
              textAnchor: "end",
              dy: "0.33em",
            })}
            label={yAxis.label}
            labelProps={{
              fill: "var(--color-muted-foreground, rgba(0,0,0,0.55))",
              fontSize: 10,
              textAnchor: "middle",
            }}
          />
        ) : null}

        {xAxis?.visible ? (
          <AxisBottom
            top={innerHeight}
            scale={xPointScale}
            hideTicks={!xAxis.showTicks}
            hideAxisLine
            tickLabelProps={() => ({
              fill: "var(--color-muted-foreground, rgba(0,0,0,0.55))",
              fontSize: 10,
              textAnchor: "middle",
            })}
            label={xAxis.label}
            labelProps={{
              fill: "var(--color-muted-foreground, rgba(0,0,0,0.55))",
              fontSize: 10,
              textAnchor: "middle",
            }}
          />
        ) : null}
      </Group>
    </svg>
  );
}

export function LineAreaChart({
  chartType,
  series,
  xAxis,
  yAxis,
  legend,
  grid,
  animation,
  ariaLabel,
  className,
  loading,
  emptyMessage = "No chart data",
}: LineAreaChartProps) {
  const preparedSeries = useMemo(
    () => prepareSeries(series, chartType),
    [series, chartType],
  );
  const insets = resolveChartInsets(legend, xAxis, yAxis);
  const hasData = preparedSeries.some((entry) => entry.points.length > 0);

  return (
    <ChartContainer className={className} ariaLabel={ariaLabel}>
      {({ width, height }) => {
        if (loading) {
          return (
            <div
              className={cn(
                "text-muted-foreground flex h-full w-full items-center justify-center text-xs",
              )}
            >
              Loading…
            </div>
          );
        }

        if (!hasData) {
          return (
            <div
              className={cn(
                "text-muted-foreground flex h-full w-full items-center justify-center text-xs",
              )}
            >
              {emptyMessage}
            </div>
          );
        }

        return (
          <>
            <ChartSvg
              width={width}
              height={height}
              preparedSeries={preparedSeries}
              xAxis={xAxis}
              yAxis={yAxis}
              grid={grid}
              animation={animation}
            />
            <ChartLegend series={series} legend={legend} insets={insets} />
          </>
        );
      }}
    </ChartContainer>
  );
}
