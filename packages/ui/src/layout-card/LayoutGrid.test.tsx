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

  it("omits inline gap when gap is null and style.gap is unset", () => {
    const { container } = render(
      <LayoutGrid gap={null} className="ub-rs-test">
        <div />
      </LayoutGrid>,
    );

    expect(container.firstElementChild).not.toHaveStyle({ gap: "12px" });
    expect(
      (container.firstElementChild as HTMLElement | null)?.style.gap,
    ).toBe("");
  });
});
