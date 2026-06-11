import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { TabbedPanel, type TabbedPanelTabId } from "./TabbedPanel";

function TabbedPanelHarness() {
  const [activeTabId, setActiveTabId] = useState<TabbedPanelTabId>("settings");

  return (
    <TabbedPanel
      ariaLabel="Form designer sections"
      activeTabId={activeTabId}
      onTabChange={setActiveTabId}
      tabs={[
        {
          id: "settings",
          label: "Settings",
          panel: <p>Settings panel content</p>,
        },
        {
          id: "layout",
          label: "Layout",
          panel: <p>Layout panel content</p>,
        },
        {
          id: "components",
          label: "Components",
          panel: <p>Components panel content</p>,
        },
      ]}
    />
  );
}

describe("TabbedPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders tab header outside the scrollable panel region", () => {
    const { container } = render(<TabbedPanelHarness />);

    const tablist = screen.getByRole("tablist", {
      name: "Form designer sections",
    });
    const scrollRegion = container.querySelector('[role="tabpanel"]');

    expect(tablist).toBeInTheDocument();
    expect(scrollRegion).not.toBeNull();
    expect(scrollRegion).toHaveClass("overflow-y-auto");
    expect(tablist.contains(scrollRegion)).toBe(false);
    expect(screen.getByText("Settings panel content")).toBeInTheDocument();
  });

  it("switches visible panel when a tab is clicked", () => {
    render(<TabbedPanelHarness />);

    fireEvent.click(screen.getByRole("tab", { name: "Layout" }));

    expect(screen.getByText("Layout panel content")).toBeInTheDocument();
    expect(
      screen.queryByText("Settings panel content"),
    ).not.toBeInTheDocument();
  });
});
