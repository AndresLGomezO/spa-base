import {
  useCallback,
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
  readonly wizardIsCurrentStepValid?: boolean;
  readonly wizardOnNext?: () => void;
  readonly wizardOnBack?: () => void;
  readonly wizardOnCancel?: () => void;
  readonly wizardOnSubmit?: () => void;
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
  wizardIsCurrentStepValid,
  wizardOnNext,
  wizardOnBack,
  wizardOnCancel,
  wizardOnSubmit,
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
          isCurrentStepValid={wizardIsCurrentStepValid}
          onNext={wizardOnNext}
          onBack={wizardOnBack}
          onCancel={wizardOnCancel}
          onSubmit={wizardOnSubmit}
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
  wizardIsCurrentStepValid,
  wizardOnNext,
  wizardOnBack,
  wizardOnCancel,
  wizardOnSubmit,
}: UseEntityFormModalFooterOptions): void {
  const footerContextRef = useRef(footerContext);
  footerContextRef.current = footerContext;

  const wizardOnNextRef = useRef(wizardOnNext);
  wizardOnNextRef.current = wizardOnNext;
  const wizardOnBackRef = useRef(wizardOnBack);
  wizardOnBackRef.current = wizardOnBack;
  const wizardOnCancelRef = useRef(wizardOnCancel);
  wizardOnCancelRef.current = wizardOnCancel;
  const wizardOnSubmitRef = useRef(wizardOnSubmit);
  wizardOnSubmitRef.current = wizardOnSubmit;

  const stableWizardOnNext = useCallback(() => {
    wizardOnNextRef.current?.();
  }, []);
  const stableWizardOnBack = useCallback(() => {
    wizardOnBackRef.current?.();
  }, []);
  const stableWizardOnCancel = useCallback(() => {
    wizardOnCancelRef.current?.();
  }, []);
  const stableWizardOnSubmit = useCallback(() => {
    wizardOnSubmitRef.current?.();
  }, []);

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
        wizardIsCurrentStepValid,
        wizardOnNext: stableWizardOnNext,
        wizardOnBack: stableWizardOnBack,
        wizardOnCancel: stableWizardOnCancel,
        wizardOnSubmit: stableWizardOnSubmit,
      }),
    [
      enabled,
      fallbackLayout,
      modalFooterLayout,
      stableWizardOnBack,
      stableWizardOnCancel,
      stableWizardOnNext,
      stableWizardOnSubmit,
      wizardCurrentStepIndex,
      wizardIsCurrentStepValid,
      wizardIsSubmitting,
      wizardMode,
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
