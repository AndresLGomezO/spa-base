import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockEditorState = vi.hoisted(() => {
  const definition = {
    id: "formula_1",
    tenantId: "tenant_a",
    name: "monthlyRateFromQuote",
    description: "Convert quoted bank rate to monthly decimal",
    inputs: [
      { name: "rate", required: true, description: "Interest rate (decimal)" },
      { name: "quote", required: true, description: "Rate quote type" },
    ],
    body: {
      kind: "input" as const,
      name: "rate",
    },
    enabled: true,
    source: "tenant" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  return {
    selectedDefinition: definition as typeof definition | null,
    definitions: [definition] as (typeof definition)[],
  };
});

vi.mock("../formulas-context", () => ({
  useFormulas: () => ({
    editor: mockEditorState,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { FormulaPreviewPanel } from "./FormulaPreviewPanel";

describe("FormulaPreviewPanel", () => {
  it("renders the selected formula and overview tab content", () => {
    mockEditorState.selectedDefinition = mockEditorState.definitions[0]!;
    render(<FormulaPreviewPanel />);

    expect(screen.getByText("formulas.preview.panelTitle")).toBeInTheDocument();
    expect(screen.getByText("monthlyRateFromQuote")).toBeInTheDocument();
    expect(
      screen.getByText("dataHooks.preview.formulas.monthlyRateFromQuote"),
    ).toBeInTheDocument();
  });

  it("shows empty message when no formula is selected", () => {
    mockEditorState.selectedDefinition = null;
    render(<FormulaPreviewPanel />);

    expect(screen.getByText("formulas.preview.empty")).toBeInTheDocument();
  });

  it("switches to the details tab", () => {
    mockEditorState.selectedDefinition = mockEditorState.definitions[0]!;
    render(<FormulaPreviewPanel />);

    fireEvent.click(
      screen.getByRole("button", { name: "dataHooks.preview.tabs.details" }),
    );

    expect(
      screen.getByText("formulas.summaryModal.sections.inputs"),
    ).toBeInTheDocument();
    expect(screen.getByText("rate")).toBeInTheDocument();
    expect(
      screen.getByText("formulas.summaryModal.sections.output"),
    ).toBeInTheDocument();
  });

  it("switches to the advanced tab", () => {
    mockEditorState.selectedDefinition = mockEditorState.definitions[0]!;
    render(<FormulaPreviewPanel />);

    fireEvent.click(
      screen.getByRole("button", { name: "dataHooks.preview.tabs.advanced" }),
    );

    expect(
      screen.getByText("formulas.summaryModal.sections.expression"),
    ).toBeInTheDocument();
  });
});
