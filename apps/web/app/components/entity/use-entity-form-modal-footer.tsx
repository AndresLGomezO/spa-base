import { useEffect, type ReactNode } from "react";
import {
  findLayoutComponent,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";

import { WizardActions } from "../forms/WizardActions";

interface UseEntityFormModalFooterOptions {
  readonly enabled: boolean;
  readonly onFooterChange?: (footer: ReactNode | null) => void;
  readonly modalFooterLayout?: UiLayoutDocument;
  readonly fallbackLayout?: UiLayoutDocument;
  readonly footerContext: LayoutRenderContext;
  readonly wizardMode?: "create" | "edit";
  readonly wizardCurrentStepIndex?: number;
  readonly wizardTotalSteps?: number;
  readonly wizardIsSubmitting?: boolean;
  readonly wizardOnNext?: () => void;
  readonly wizardOnBack?: () => void;
  readonly wizardOnCancel?: () => void;
}

export function useEntityFormModalFooter({
  enabled,
  onFooterChange,
  modalFooterLayout,
  fallbackLayout,
  footerContext,
  wizardMode,
  wizardCurrentStepIndex,
  wizardTotalSteps,
  wizardIsSubmitting,
  wizardOnNext,
  wizardOnBack,
  wizardOnCancel,
}: UseEntityFormModalFooterOptions): void {
  useEffect(() => {
    if (!onFooterChange) {
      return;
    }

    if (!enabled) {
      onFooterChange(null);
      return;
    }

    if (modalFooterLayout) {
      onFooterChange(
        <RecursiveLayoutRenderer
          layout={modalFooterLayout}
          context={footerContext}
        />,
      );
      return () => onFooterChange(null);
    }

    if (
      fallbackLayout &&
      wizardMode != null &&
      wizardCurrentStepIndex != null
    ) {
      const config = findLayoutComponent(fallbackLayout, "wizard-actions");
      if (
        config?.kind === "wizard-actions" &&
        wizardTotalSteps != null &&
        wizardOnNext &&
        wizardOnBack &&
        wizardOnCancel
      ) {
        onFooterChange(
          <WizardActions
            config={config}
            mode={wizardMode}
            currentStepIndex={wizardCurrentStepIndex}
            totalSteps={wizardTotalSteps}
            isSubmitting={wizardIsSubmitting}
            onNext={wizardOnNext}
            onBack={wizardOnBack}
            onCancel={wizardOnCancel}
          />,
        );
        return () => onFooterChange(null);
      }
    }

    if (fallbackLayout) {
      const config = findLayoutComponent(fallbackLayout, "form-actions");
      if (config?.kind === "form-actions") {
        onFooterChange(footerContext.formActionsRenderer?.() ?? null);
        return () => onFooterChange(null);
      }
    }

    onFooterChange(null);
    return () => onFooterChange(null);
  }, [
    enabled,
    fallbackLayout,
    footerContext,
    modalFooterLayout,
    onFooterChange,
    wizardCurrentStepIndex,
    wizardIsSubmitting,
    wizardMode,
    wizardOnBack,
    wizardOnCancel,
    wizardOnNext,
    wizardTotalSteps,
  ]);
}
