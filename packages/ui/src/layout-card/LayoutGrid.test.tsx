import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LayoutGrid } from "./LayoutGrid.js";

describe("LayoutGrid", () => {
  afterEach(() => {
    cleanup();
  });

  it("uses pixel gap from the gap prop when style.gap is not set", () => {
    const { container } = render(
      <LayoutGrid gap={16}>
        <div />
      </LayoutGrid>,
    );

    expect(container.firstElementChild).toHaveStyle({ gap: "16px" });
  });

  it("preserves CSS token gap from style instead of forcing gap px", () => {
    const { container } = render(
      <LayoutGrid gap={0} style={{ gap: "var(--spacing-comfortable)" }}>
        <div />
      </LayoutGrid>,
    );

    expect(container.firstElementChild).toHaveStyle({
      gap: "var(--spacing-comfortable)",
    });
  });
});
