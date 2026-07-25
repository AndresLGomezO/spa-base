import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { Markdown } from "./Markdown";

describe("Markdown", () => {
  it("renders headings, lists, and emoji-bearing labels", () => {
    render(
      <Markdown>
        {[
          "## 🧾 Section One",
          "",
          "Body paragraph.",
          "",
          "### Metrics",
          "",
          "- Balance: 100",
        ].join("\n")}
      </Markdown>,
    );

    expect(
      screen.getByRole("heading", { name: /Section One/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Metrics/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Body paragraph/i)).toBeInTheDocument();
    expect(screen.getByText(/Balance: 100/i)).toBeInTheDocument();
  });

  it("renders callout blockquotes, metric tables, and unicode meter bars", () => {
    render(
      <Markdown>
        {[
          "> **De un vistazo:** Neutral overview.",
          "",
          "`████████░░` **80%**",
          "",
          "| Dato | Valor |",
          "| --- | --- |",
          "| Balance | 100 |",
        ].join("\n")}
      </Markdown>,
    );

    expect(screen.getByText(/De un vistazo/i)).toBeInTheDocument();
    expect(screen.getByText(/████████░░/)).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Balance")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("dispatches matching fenced languages to blockRenderers", () => {
    render(
      <Markdown
        blockRenderers={{
          "chart-progress": (raw) => (
            <div data-testid="chart-progress">{raw}</div>
          ),
        }}
      >
        {["```chart-progress", '{"percent":50}', "```"].join("\n")}
      </Markdown>,
    );

    expect(screen.getByTestId("chart-progress")).toHaveTextContent(
      '{"percent":50}',
    );
  });

  it("promotes mid-paragraph chart fences into block renderers", () => {
    render(
      <Markdown
        blockRenderers={{
          "chart-bar": (raw) => <div data-testid="chart-bar">{raw}</div>,
        }}
      >
        {[
          "Intro sentence. ```chart-bar",
          '{"title":"Mix","segments":[{"label":"A","value":1}]}',
          "```",
          "Trailing sentence.",
        ].join("\n")}
      </Markdown>,
    );

    expect(screen.getByTestId("chart-bar")).toHaveTextContent('"title":"Mix"');
    expect(screen.getByText(/Intro sentence/i)).toBeInTheDocument();
    expect(screen.getByText(/Trailing sentence/i)).toBeInTheDocument();
  });

  it("promotes consecutive mid-paragraph chart fences without splitting the next opener", () => {
    const { container } = render(
      <Markdown
        blockRenderers={{
          "chart-bar": (raw) => <div data-testid="pair-bar">{raw}</div>,
          "chart-pie": (raw) => <div data-testid="pair-pie">{raw}</div>,
        }}
      >
        {[
          "Before bar. ```chart-bar",
          '{"title":"Bar","segments":[{"label":"A","value":1}]}',
          "```",
          "",
          "Before pie. ```chart-pie",
          '{"title":"Pie","slices":[{"label":"A","value":1}]}',
          "```",
          "After pie.",
        ].join("\n")}
      </Markdown>,
    );

    expect(screen.getByTestId("pair-bar")).toHaveTextContent('"title":"Bar"');
    expect(screen.getByTestId("pair-pie")).toHaveTextContent('"title":"Pie"');
    expect(container).not.toHaveTextContent(/^chart-pie$/m);
    expect(screen.getByText(/After pie/i)).toBeInTheDocument();
  });

  it("omits the block when the renderer returns null", () => {
    const { container } = render(
      <Markdown
        blockRenderers={{
          "chart-pie": () => null,
        }}
      >
        {["```chart-pie", '{"slices":[]}', "```", "", "After chart."].join(
          "\n",
        )}
      </Markdown>,
    );

    expect(container.querySelector("pre")).toBeNull();
    expect(screen.getByText("After chart.")).toBeInTheDocument();
  });

  it("omits the block when the renderer throws", () => {
    const renderer = vi.fn(() => {
      throw new Error("boom");
    });
    const { container } = render(
      <Markdown blockRenderers={{ "chart-bar": renderer }}>
        {["```chart-bar", "not-json", "```", "", "Survived."].join("\n")}
      </Markdown>,
    );

    expect(renderer).toHaveBeenCalled();
    expect(container.querySelector("pre")).toBeNull();
    expect(screen.getByText("Survived.")).toBeInTheDocument();
  });

  it("renders unknown fenced languages as code", () => {
    const { container } = render(
      <Markdown blockRenderers={{ "chart-pie": () => <div>pie</div> }}>
        {["```json", '{"ok":true}', "```"].join("\n")}
      </Markdown>,
    );

    expect(container.querySelector("pre")).not.toBeNull();
    expect(screen.getByText('{"ok":true}')).toBeInTheDocument();
    expect(screen.queryByText("pie")).not.toBeInTheDocument();
  });
});
