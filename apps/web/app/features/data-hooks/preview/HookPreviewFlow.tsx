import { Text } from "@repo/ui";

import type { HookPreviewModel } from "./hook-preview-types.js";
import { HookPreviewStepCard } from "./HookPreviewStepCard.js";

interface HookPreviewFlowProps {
  readonly model: HookPreviewModel;
  readonly mode: "overview" | "details" | "advanced";
}

export function HookPreviewFlow({ model, mode }: HookPreviewFlowProps) {
  return (
    <div className="space-y-1">
      {model.steps.map((step, index) => (
        <HookPreviewStepCard
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
