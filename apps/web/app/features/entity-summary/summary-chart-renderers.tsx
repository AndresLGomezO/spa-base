import type { ReactNode } from "react";
import type { MarkdownBlockRenderer } from "@repo/ui";
import {
  LineAreaChart,
  PieChart,
  ProgressBar,
  SplitBar,
} from "@repo/ui-charts";

function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function ChartFigure({
  title,
  children,
}: {
  readonly title?: string;
  readonly children: ReactNode;
}) {
  return (
    <figure className="border-border bg-muted/20 my-1 flex flex-col items-center rounded-md border p-4">
      {title ? (
        <figcaption className="text-foreground mb-3 w-full text-center text-xs font-medium">
          {title}
        </figcaption>
      ) : null}
      <div className="flex w-full max-w-full flex-col items-center justify-center">
        {children}
      </div>
    </figure>
  );
}

function renderProgress(raw: string): ReactNode {
  const data = parseJsonObject(raw);
  if (!data) {
    return null;
  }
  const percent = asFiniteNumber(data.percent);
  if (percent === null) {
    return null;
  }
  const label = asTrimmedString(data.label);
  const caption = asTrimmedString(data.caption);
  return (
    <ChartFigure>
      <ProgressBar label={label} percent={percent} caption={caption} />
    </ChartFigure>
  );
}

function renderPie(raw: string): ReactNode {
  const data = parseJsonObject(raw);
  if (!data) {
    return null;
  }
  if (!Array.isArray(data.slices)) {
    return null;
  }
  const slices = data.slices
    .map((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }
      const row = entry as Record<string, unknown>;
      const label = asTrimmedString(row.label);
      const value = asFiniteNumber(row.value);
      if (!label || value === null || value <= 0) {
        return null;
      }
      return {
        id: asTrimmedString(row.id) ?? `slice-${index}`,
        label,
        value,
        color: asTrimmedString(row.color),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (slices.length === 0) {
    return null;
  }

  const title = asTrimmedString(data.title);
  return (
    <ChartFigure title={title}>
      <PieChart slices={slices} />
    </ChartFigure>
  );
}

function renderBar(raw: string): ReactNode {
  const data = parseJsonObject(raw);
  if (!data) {
    return null;
  }
  if (!Array.isArray(data.segments)) {
    return null;
  }
  const segments = data.segments
    .map((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }
      const row = entry as Record<string, unknown>;
      const label = asTrimmedString(row.label);
      const value = asFiniteNumber(row.value);
      if (!label || value === null || value <= 0) {
        return null;
      }
      return {
        id: asTrimmedString(row.id) ?? `segment-${index}`,
        label,
        value,
        color: asTrimmedString(row.color),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (segments.length === 0) {
    return null;
  }

  const title = asTrimmedString(data.title);
  return (
    <ChartFigure title={title}>
      <SplitBar segments={segments} />
    </ChartFigure>
  );
}

function renderSparkline(raw: string): ReactNode {
  const data = parseJsonObject(raw);
  if (!data) {
    return null;
  }
  if (!Array.isArray(data.points) || data.points.length < 2) {
    return null;
  }
  const points = data.points
    .map((point, index) => {
      const y = asFiniteNumber(point);
      if (y === null) {
        return null;
      }
      return { x: String(index + 1), y };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (points.length < 2) {
    return null;
  }

  const title = asTrimmedString(data.title);
  return (
    <ChartFigure title={title}>
      <div className="mx-auto h-28 w-full max-w-md">
        <LineAreaChart
          chartType="area"
          series={[
            {
              id: "spark",
              label: title ?? "Serie",
              points,
            },
          ]}
          legend={{ visible: false, position: "none" }}
          xAxis={{ visible: false }}
          yAxis={{ visible: false }}
          grid={{ visible: false }}
          className="h-full w-full"
        />
      </div>
    </ChartFigure>
  );
}

function asBlockRenderer(
  render: (raw: string) => ReactNode,
): MarkdownBlockRenderer {
  return (raw) => {
    try {
      return render(raw);
    } catch {
      return null;
    }
  };
}

export const summaryChartBlockRenderers: Readonly<
  Record<string, MarkdownBlockRenderer>
> = {
  "chart-progress": asBlockRenderer(renderProgress),
  "chart-pie": asBlockRenderer(renderPie),
  "chart-bar": asBlockRenderer(renderBar),
  "chart-sparkline": asBlockRenderer(renderSparkline),
};
