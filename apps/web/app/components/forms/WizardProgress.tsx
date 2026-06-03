import {
  matchConditionalStyles,
  splitStyleRuleClasses,
  type WizardProgressComponentConfig,
  type WizardStepStatusKind,
} from "@repo/ui-builder-core";
import { Check } from "lucide-react";

import { resolveLucideIcon } from "../../lib/resolve-lucide-icon";
import type { WizardRenderState } from "@repo/ui-builder-renderer";

interface WizardProgressProps {
  readonly config: WizardProgressComponentConfig;
  readonly wizard: WizardRenderState;
}

function statusForStep(
  wizard: WizardRenderState,
  stepId: string,
): WizardStepStatusKind {
  return wizard.stepStatuses[stepId] ?? "pending";
}

export function WizardProgress({ config, wizard }: WizardProgressProps) {
  const { containerClassName } = splitStyleRuleClasses(config.styles);

  return (
    <nav className={containerClassName} aria-label="Form steps">
      <ol className="flex flex-col gap-1">
        {wizard.steps.map((step, index) => {
          const status = statusForStep(wizard, step.id);
          const matched = matchConditionalStyles(
            status,
            config.conditionalStyles,
          );
          const rowClassName = [
            "flex items-start gap-3 rounded-md px-3 py-2 text-sm",
            status === "active" ? "bg-muted/60" : "",
            matched.className,
          ]
            .filter(Boolean)
            .join(" ");

          const Icon = step.icon ? resolveLucideIcon(step.icon) : null;

          return (
            <li key={step.id} className={rowClassName}>
              <span
                className="text-muted-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center"
                aria-hidden
              >
                {status === "completed" ? (
                  <Check className="size-4 text-emerald-600" />
                ) : Icon ? (
                  <Icon className="size-4" />
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">{step.label}</span>
                {step.subtitle ? (
                  <span className="text-muted-foreground text-xs">
                    {step.subtitle}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
