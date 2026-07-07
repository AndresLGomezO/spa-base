import { Text } from "@repo/ui";

import type { EntityQueryPreviewModel } from "./entity-query-preview-types.js";
import { EntityQueryPreviewStepCard } from "./EntityQueryPreviewStepCard.js";

interface EntityQueryPreviewFlowProps {
  readonly model: EntityQueryPreviewModel;
  readonly mode: "overview" | "details" | "advanced";
}

export function EntityQueryPreviewFlow({
  model,
  mode,
}: EntityQueryPreviewFlowProps) {
  return (
    <div className="space-y-1">
      {model.steps.map((step, index) => (
        <EntityQueryPreviewStepCard
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
