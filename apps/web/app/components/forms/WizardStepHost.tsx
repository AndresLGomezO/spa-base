import {
  layoutInlineStyleFromStyleRules,
  splitStyleRuleClasses,
  type WizardStepHostComponentConfig,
} from "@repo/ui-builder-core";
import type { ReactNode } from "react";

interface WizardStepHostProps {
  readonly config: WizardStepHostComponentConfig;
  readonly children: ReactNode;
}

export function WizardStepHost({ config, children }: WizardStepHostProps) {
  const { containerClassName } = splitStyleRuleClasses(config.styles);
  const style = layoutInlineStyleFromStyleRules(config.styles);

  return (
    <div className={containerClassName} style={style}>
      {children}
    </div>
  );
}
