import { Text } from "@repo/ui";

import type { FormulaPreviewModel } from "./formula-preview-types.js";
import { FormulaPreviewStepCard } from "./FormulaPreviewStepCard.js";

interface FormulaPreviewFlowProps {
  readonly model: FormulaPreviewModel;
  readonly mode: "overview" | "details" | "advanced";
}

export function FormulaPreviewFlow({ model, mode }: FormulaPreviewFlowProps) {
  return (
    <div className="space-y-1">
      {model.steps.map((step, index) => (
        <FormulaPreviewStepCard
          key={step.id}
          step={step}
          mode={mode}
          showConnector={index < model.steps.length - 1}
        />
      ))}
      {model.metaChips.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-2">
          {model.metaChips.map((chip) => (
            <span
              key={chip}
              className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}
      {mode === "overview" && model.description ? (
        <Text className="text-muted-foreground pt-2 text-xs">
          {model.description}
        </Text>
      ) : null}
    </div>
  );
}
