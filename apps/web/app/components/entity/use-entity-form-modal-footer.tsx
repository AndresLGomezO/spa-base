import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  findLayoutComponent,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";

import { WizardActions } from "../forms/WizardActions";

interface ResolveEntityFormModalFooterOptions {
  readonly enabled: boolean;
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

export function resolveEntityFormModalFooter({
  enabled,
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
}: ResolveEntityFormModalFooterOptions): ReactNode | null {
  if (!enabled) {
    return null;
  }

  if (modalFooterLayout) {
    return (
      <RecursiveLayoutRenderer
        layout={modalFooterLayout}
        context={footerContext}
      />
    );
  }

  if (fallbackLayout && wizardMode != null && wizardCurrentStepIndex != null) {
    const config = findLayoutComponent(fallbackLayout, "wizard-actions");
    if (
      config?.kind === "wizard-actions" &&
      wizardTotalSteps != null &&
      wizardOnNext &&
      wizardOnBack &&
      wizardOnCancel
    ) {
      return (
        <WizardActions
          config={config}
          mode={wizardMode}
          currentStepIndex={wizardCurrentStepIndex}
          totalSteps={wizardTotalSteps}
          isSubmitting={wizardIsSubmitting}
          onNext={wizardOnNext}
          onBack={wizardOnBack}
          onCancel={wizardOnCancel}
        />
      );
    }
  }

  if (fallbackLayout) {
    const config = findLayoutComponent(fallbackLayout, "form-actions");
    if (config?.kind === "form-actions") {
      return footerContext.formActionsRenderer?.() ?? null;
    }
  }

  return null;
}

interface UseEntityFormModalFooterOptions extends ResolveEntityFormModalFooterOptions {
  readonly onFooterChange?: (footer: ReactNode | null) => void;
}

export function useEntityFormModalFooter({
  onFooterChange,
  enabled,
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
  const footerContextRef = useRef(footerContext);
  footerContextRef.current = footerContext;

  const footer = useMemo(
    () =>
      resolveEntityFormModalFooter({
        enabled,
        modalFooterLayout,
        fallbackLayout,
        footerContext: footerContextRef.current,
        wizardMode,
        wizardCurrentStepIndex,
        wizardTotalSteps,
        wizardIsSubmitting,
        wizardOnNext,
        wizardOnBack,
        wizardOnCancel,
      }),
    [
      enabled,
      fallbackLayout,
      modalFooterLayout,
      wizardCurrentStepIndex,
      wizardIsSubmitting,
      wizardMode,
      wizardOnBack,
      wizardOnCancel,
      wizardOnNext,
      wizardTotalSteps,
    ],
  );

  const wasEnabledRef = useRef(enabled);
  wasEnabledRef.current = enabled;

  useLayoutEffect(() => {
    if (!enabled || !onFooterChange) {
      return;
    }

    onFooterChange(footer);
  }, [enabled, footer, onFooterChange]);

  useEffect(() => {
    if (!onFooterChange) {
      return;
    }

    return () => {
      if (wasEnabledRef.current) {
        onFooterChange(null);
      }
    };
  }, [onFooterChange]);
}
