import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DesignLayoutEntitySubtitle } from "./DesignLayoutEntitySubtitle";

vi.mock("./use-design-layout-target-options", () => ({
  useDesignLayoutTargetOptions: () => ({
    optionGroups: [
      {
        labelKey: "designLayout.targetGroup.entities",
        options: [
          { value: "entity:loan", label: "Loans" },
          { value: "entity:deal", label: "Deals" },
        ],
      },
      {
        labelKey: "designLayout.targetGroup.customViews",
        options: [
          {
            value: "customView:upcoming-payments",
            label: "Upcoming payments",
          },
        ],
      },
    ],
    defaultEntity: "loan",
    isLoading: false,
    canAccessDesignLayout: true,
    hasCustomViewOptions: true,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("DesignLayoutEntitySubtitle", () => {
  it("renders entity select and calls onTargetChange", () => {
    const onTargetChange = vi.fn();

    render(
      <DesignLayoutEntitySubtitle
        kind="main"
        entityName="loan"
        onTargetChange={onTargetChange}
      />,
    );

    expect(screen.getByText("designLayout.targetLabel")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("designLayout.targetLabel"), {
      target: { value: "entity:deal" },
    });
    expect(onTargetChange).toHaveBeenCalledWith("entity:deal");
  });

  it("shows custom-view selection when customViewId is provided", () => {
    render(
      <DesignLayoutEntitySubtitle
        kind="main"
        entityName="loan"
        customViewId="upcoming-payments"
        onTargetChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("designLayout.targetLabel")).toHaveValue(
      "customView:upcoming-payments",
    );
  });
});
