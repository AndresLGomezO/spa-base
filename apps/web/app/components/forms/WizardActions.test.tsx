import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WizardActionsComponentConfig } from "@repo/ui-builder-core";

import { WizardActions } from "./WizardActions";

const config = {
  kind: "wizard-actions",
} satisfies WizardActionsComponentConfig;

const defaultProps = {
  config,
  mode: "create" as const,
  currentStepIndex: 0,
  totalSteps: 2,
  onNext: vi.fn(),
  onBack: vi.fn(),
  onCancel: vi.fn(),
  onSubmit: vi.fn(),
};

describe("WizardActions", () => {
  it("disables Next when the current step is invalid", () => {
    render(<WizardActions {...defaultProps} isCurrentStepValid={false} />);

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("disables Create on the last step when the current step is invalid", () => {
    render(
      <WizardActions
        {...defaultProps}
        currentStepIndex={1}
        isCurrentStepValid={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("uses an explicit button click for Create instead of form submit", () => {
    const onSubmit = vi.fn();

    render(
      <WizardActions
        {...defaultProps}
        currentStepIndex={1}
        isCurrentStepValid
        onSubmit={onSubmit}
      />,
    );

    const createButton = screen.getByRole("button", { name: "Create" });
    expect(createButton).toHaveAttribute("type", "button");
    expect(createButton).toBeEnabled();

    fireEvent.click(createButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
