import type { HookPreviewWidget } from "./hook-preview-types.js";
import { HookPreviewFrequencyTable } from "./HookPreviewFrequencyTable.js";
import { HookPreviewLoopExample } from "./HookPreviewLoopExample.js";
import { HookPreviewRowCountRules } from "./HookPreviewRowCountRules.js";
import { FormulaExpressionPreview } from "../../formulas/FormulaExpressionPreview.js";
import { Text } from "@repo/ui";

interface HookPreviewWidgetsProps {
  readonly widgets: readonly HookPreviewWidget[];
  readonly mode: "overview" | "details" | "advanced";
}

export function HookPreviewWidgets({ widgets, mode }: HookPreviewWidgetsProps) {
  if (widgets.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {widgets.map((widget, index) => {
        const key = `${widget.type}-${index}`;
        if (widget.type === "frequencyTable" && mode !== "advanced") {
          return <HookPreviewFrequencyTable key={key} />;
        }
        if (widget.type === "rowCountRules" && mode !== "overview") {
          return (
            <HookPreviewRowCountRules key={key} ruleKey={widget.ruleKey} />
          );
        }
        if (widget.type === "loopExample" && mode === "overview") {
          return <HookPreviewLoopExample key={key} fields={widget.fields} />;
        }
        if (widget.type === "bulletList") {
          return (
            <ul
              key={key}
              className="text-muted-foreground list-disc space-y-1 pl-4 text-xs"
            >
              {widget.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }
        if (widget.type === "dsl" && mode === "advanced") {
          return (
            <div key={key} className="space-y-1">
              <Text className="text-muted-foreground text-xs font-medium">
                {widget.label}
              </Text>
              <FormulaExpressionPreview
                value={widget.expression}
                showTitle={false}
              />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
