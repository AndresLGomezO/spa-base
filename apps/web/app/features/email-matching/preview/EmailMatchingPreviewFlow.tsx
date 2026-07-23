import { Text } from "@repo/ui";

import type { EmailMatchingPreviewModel } from "./email-matching-preview-types.js";
import { EmailMatchingPreviewStepCard } from "./EmailMatchingPreviewStepCard.js";

interface EmailMatchingPreviewFlowProps {
  readonly model: EmailMatchingPreviewModel;
  readonly mode: "overview" | "details" | "advanced";
}

export function EmailMatchingPreviewFlow({
  model,
  mode,
}: EmailMatchingPreviewFlowProps) {
  return (
    <div className="space-y-1">
      {model.steps.map((step, index) => (
        <EmailMatchingPreviewStepCard
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
