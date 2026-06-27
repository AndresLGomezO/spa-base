import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FormDesignerComponentRowChrome } from "./FormDesignerComponentRowChrome";
import type { ComponentRowRef } from "./form-designer-component-row-ref";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const textRow = {
  type: "component" as const,
  id: "text-1",
  component: {
    kind: "text" as const,
    primary: { type: "static" as const, value: "Hello" },
  },
};

const rowRef: ComponentRowRef = {
  rowId: "text-1",
  locator: { scope: "root", columnIndex: 0 },
};

function renderRowChrome(focusState: "focused" | "dimmed" | "none") {
  const { container } = render(
    <FormDesignerComponentRowChrome
      rowRef={rowRef}
      row={textRow}
      focusState={focusState}
      isStructuralRow={false}
      onHover={vi.fn()}
      onSelect={vi.fn()}
      onDelete={vi.fn()}
    >
      <p>Preview content</p>
    </FormDesignerComponentRowChrome>,
  );

  return container;
}

describe("FormDesignerComponentRowChrome", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders focus ring behind content when focused", () => {
    const container = renderRowChrome("focused");

    const content = screen.getByText("Preview content").parentElement;
    expect(content).toHaveClass("z-10");

    const focusRing = container.querySelector('[aria-hidden="true"]');
    expect(focusRing).toHaveClass("z-0");
    expect(focusRing).toHaveClass("ring-primary");
    expect(focusRing).not.toHaveClass("bg-background/60");

    expect(container.querySelector(".bg-background\\/60")).toBeNull();
  });

  it("renders dim overlay above content when dimmed", () => {
    const container = renderRowChrome("dimmed");

    const content = screen.getByText("Preview content").parentElement;
    expect(content).toHaveClass("z-10");

    const dimOverlay = container.querySelector(".bg-background\\/60");
    expect(dimOverlay).not.toBeNull();
    expect(dimOverlay).toHaveClass("z-20");
    expect(dimOverlay).not.toHaveClass("ring-primary");
  });

  it("renders no highlight or dim layers when unfocused", () => {
    const container = renderRowChrome("none");

    expect(container.querySelector(".ring-primary")).toBeNull();
    expect(container.querySelector(".bg-background\\/60")).toBeNull();
  });
});
