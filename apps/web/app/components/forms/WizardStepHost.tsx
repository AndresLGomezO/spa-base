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
      className={cn(
        "flex min-h-0 flex-1 w-full min-w-0 flex-col overflow-hidden overflow-x-hidden",
        containerClassName,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
