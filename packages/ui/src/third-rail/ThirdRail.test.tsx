import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OverlayTransitionVisibleProvider } from "../overlay/useOverlayTransition";
import { ThirdRail } from "./ThirdRail";

function renderThirdRail(
  props: Partial<ComponentProps<typeof ThirdRail>> = {},
) {
  return render(
    <OverlayTransitionVisibleProvider visible durationMs={0}>
      <ThirdRail
        titleId="third-rail-title"
        title="Edit record"
        subtitle="Acme Corp"
        body={<p>Body content</p>}
        variant="push"
        closeLabel="Close panel"
        onClose={vi.fn()}
        {...props}
      />
    </OverlayTransitionVisibleProvider>,
  );
}

describe("ThirdRail", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders title and subtitle in the header", () => {
    renderThirdRail();

    expect(
      screen.getByRole("heading", { name: "Edit record" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("renders scrollable body region", () => {
    const { container } = renderThirdRail();

    const body = container.querySelector(".overflow-y-auto");
    expect(body).not.toBeNull();
    expect(body).toHaveClass("overflow-x-hidden");
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("renders footer when provided", () => {
    renderThirdRail({ footer: <button type="button">Save</button> });

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("omits footer when not provided", () => {
    const { container } = renderThirdRail();

    expect(container.querySelector(".border-t")).toBeNull();
  });

  it("uses dialog role in overlay variant", () => {
    renderThirdRail({ variant: "overlay" });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("applies ai tone chrome when tone is ai", () => {
    const { container } = renderThirdRail({ tone: "ai" });

    expect(container.querySelector(".third-rail-tone-ai")).not.toBeNull();
    expect(container.querySelector(".third-rail-header-ai")).not.toBeNull();
    expect(container.querySelector(".third-rail-title-ai")).not.toBeNull();
  });
});
