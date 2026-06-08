import {
  layoutInlineStyleFromStyleRules,
  splitStyleRuleClasses,
  type WizardStepHostComponentConfig,
} from "@repo/ui-builder-core";
import { cn } from "@repo/theme/utils";
import type { ReactNode } from "react";

interface WizardStepHostProps {
  readonly config: WizardStepHostComponentConfig;
  readonly children: ReactNode;
}

export function WizardStepHost({ config, children }: WizardStepHostProps) {
  const { containerClassName } = splitStyleRuleClasses(config.styles);
  const style = layoutInlineStyleFromStyleRules(config.styles);

  return (
    <div
      className={cn("flex w-full min-w-0 flex-col", containerClassName)}
      style={style}
    >
      {children}
    </div>
  );
}
