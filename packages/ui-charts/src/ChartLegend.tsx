import type { CSSProperties } from "react";

import { resolveLegendFontWeight, type ChartInsets } from "./chart-layout.js";
import type { ChartLegendOptions, ChartRenderSeries } from "./types.js";

function legendPositionStyle(
  position: NonNullable<ChartLegendOptions["position"]>,
  insets: ChartInsets,
): CSSProperties {
  const base: CSSProperties = {
    position: "absolute",
    display: "flex",
    gap: 12,
    padding: 4,
    pointerEvents: "none",
  };

  switch (position) {
    case "top":
      return {
        ...base,
        top: 0,
        left: insets.left,
        right: insets.right,
        flexDirection: "row",
        justifyContent: "flex-start",
      };
    case "bottom":
      return {
        ...base,
        bottom: 0,
        left: insets.left,
        right: insets.right,
        flexDirection: "row",
        justifyContent: "flex-start",
      };
    case "left":
      return {
        ...base,
        top: insets.top,
        bottom: insets.bottom,
        left: 0,
        width: insets.left,
        flexDirection: "column",
      };
    case "right":
      return {
        ...base,
        top: insets.top,
        bottom: insets.bottom,
        right: 0,
        width: insets.right,
        flexDirection: "column",
      };
    default:
      return { display: "none" };
  }
}

function resolveJustifyContent(
  align: ChartLegendOptions["align"],
): CSSProperties["justifyContent"] {
  switch (align) {
    case "center":
      return "center";
    case "end":
      return "flex-end";
    default:
      return "flex-start";
  }
}

export function ChartLegend({
  series,
  legend,
  insets,
}: {
  readonly series: readonly ChartRenderSeries[];
  readonly legend: ChartLegendOptions | undefined;
  readonly insets: ChartInsets;
}) {
  if (!legend?.visible || legend.position === "none" || series.length === 0) {
    return null;
  }

  const position = legend.position ?? "bottom";
  const style = legendPositionStyle(position, insets);
  const fontSize = legend.fontSize ?? 11;
  const fontWeight = resolveLegendFontWeight(legend.fontWeight);

  return (
    <div
      style={{
        ...style,
        justifyContent: resolveJustifyContent(legend.align),
      }}
    >
      {series.map((entry) => (
        <div
          key={entry.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize,
            fontWeight,
            color: "var(--color-muted-foreground, rgba(0,0,0,0.6))",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              backgroundColor:
                entry.color ?? "var(--color-primary, currentColor)",
              flexShrink: 0,
            }}
          />
          <span>{entry.label}</span>
        </div>
      ))}
    </div>
  );
}
