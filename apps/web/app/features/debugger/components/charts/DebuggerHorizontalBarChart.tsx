import { Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { DEBUGGER_BAR_FILL_CLASS } from "../../debugger-summary-motion";

const CHART_COLOR_VARS = [
  "--color-chart-1",
  "--color-chart-2",
  "--color-chart-3",
  "--color-chart-4",
] as const;

interface DebuggerHorizontalBarItem {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly suffix?: string;
}

export function DebuggerHorizontalBarChart({
  items,
  valueSuffix,
  layout = "compact",
}: {
  readonly items: readonly DebuggerHorizontalBarItem[];
  readonly valueSuffix?: string;
  readonly layout?: "compact" | "expanded";
}) {
  if (items.length === 0) {
    return null;
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const isExpanded = layout === "expanded";

  return (
    <div
      className={cn(
        "w-full",
        isExpanded &&
          "flex min-h-[min(50vh,28rem)] flex-col justify-center px-4 py-2",
      )}
    >
      <ul
        className={cn(
          "w-full",
          isExpanded ? "mx-auto max-w-2xl space-y-5" : "space-y-2.5",
        )}
      >
        {items.map((item, index) => {
          const widthPercent = Math.max(4, (item.value / maxValue) * 100);
          const colorVar = CHART_COLOR_VARS[index % CHART_COLOR_VARS.length];
          const barHeight = isExpanded ? "h-6" : "h-2";

          return (
            <li key={item.key} className="space-y-1.5">
              <div
                className={cn(
                  "flex items-center justify-between gap-2",
                  isExpanded ? "text-lg" : "text-sm",
                )}
              >
                <Text className="min-w-0 break-words">{item.label}</Text>
                <Text className="text-muted-foreground shrink-0 tabular-nums">
                  {item.value}
                  {item.suffix ?? valueSuffix ?? ""}
                </Text>
              </div>
              <div
                className={cn(
                  "bg-muted overflow-hidden rounded-full",
                  barHeight,
                )}
              >
                <div
                  className={cn(
                    "rounded-full",
                    DEBUGGER_BAR_FILL_CLASS,
                    barHeight,
                  )}
                  style={{
                    width: `${widthPercent}%`,
                    backgroundColor: `var(${colorVar})`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
