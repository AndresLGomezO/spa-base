import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BuilderPageShell } from "./BuilderPageShell";

describe("BuilderPageShell", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders title and subtitle in the fixed header region", () => {
    const { container } = render(
      <BuilderPageShell
        title="Form Designer"
        subtitle="Entity: Account"
        actions={<button type="button">Preview</button>}
      >
        <p>Body content</p>
      </BuilderPageShell>,
    );

    expect(
      screen.getByRole("heading", { name: "Form Designer" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Entity: Account")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview" })).toBeInTheDocument();

    const header = container.querySelector("header");
    const scrollRegion = container.querySelector(".overflow-y-auto");

    expect(header).not.toBeNull();
    expect(scrollRegion).not.toBeNull();
    expect(header?.contains(scrollRegion)).toBe(false);
    expect(scrollRegion).toHaveClass("overflow-x-hidden");
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("uses overflow-hidden on body when bodyScrollable is false", () => {
    const { container } = render(
      <BuilderPageShell title="Form Designer" bodyScrollable={false}>
        <p>Nested scroll content</p>
      </BuilderPageShell>,
    );

    const body = container.querySelector(".min-h-0.flex-1");
    expect(body).not.toBeNull();
    expect(body).toHaveClass("overflow-hidden");
    expect(body).not.toHaveClass("overflow-y-auto");
  });

  it("omits subtitle and actions when not provided", () => {
    render(
      <BuilderPageShell title="Form Designer">
        <p>Body only</p>
      </BuilderPageShell>,
    );

    expect(screen.getByText("Body only")).toBeInTheDocument();
    expect(screen.queryByText("Entity:")).not.toBeInTheDocument();
  });
});
