import { render, screen } from "@testing-library/react";
import { describe, beforeEach, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import type { MetricWidgetComponentConfig } from "@repo/ui-builder-core";

import { i18n } from "../../i18n";
import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { MetricWidgetSlot } from "./MetricWidgetSlot";

vi.mock("../../entities/entity-catalog-context", () => ({
  useEntityCatalog: vi.fn(),
}));

vi.mock("@repo/ui-builder-renderer", () => ({
  EmbeddedLayoutRenderer: ({
    shellClassName,
  }: {
    readonly shellClassName?: string;
  }) => (
    <div data-testid="metric-widget-layout" className={shellClassName}>
      Widget layout
    </div>
  ),
}));

import { useEntityCatalog } from "../../entities/entity-catalog-context";

const mockUseEntityCatalog = vi.mocked(useEntityCatalog);

function createCatalogEntry(
  name: string,
  widgets: Array<{ id: string; name: string }>,
): EntityCatalogEntry {
  return {
    name,
    fields: {},
    ui: {
      views: [{ type: "table", name: "default", fields: ["name"] }],
      metricWidgets: widgets.map((widget) => ({
        id: widget.id,
        name: widget.name,
        layout: {
          showActions: true,
          root: {
            type: "root",
            id: "root-1",
            columnCount: 1,
            columns: [{ id: "col-1", rows: [] }],
          },
        },
      })),
    },
  } as unknown as EntityCatalogEntry;
}

const catalog = [
  createCatalogEntry("account", [{ id: "widget-1", name: "Total Accounts" }]),
];

const buildLayoutContext = vi.fn(() => ({
  mode: "listItem" as const,
  data: {},
  locale: "en",
  resolveField: () => undefined,
}));

function renderSlot(config: MetricWidgetComponentConfig) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MetricWidgetSlot
        config={config}
        buildLayoutContext={buildLayoutContext}
      />
    </I18nextProvider>,
  );
}

describe("MetricWidgetSlot", () => {
  beforeEach(() => {
    buildLayoutContext.mockClear();
    mockUseEntityCatalog.mockReturnValue({
      items: catalog,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      getDefinition: vi.fn(),
      isKnownEntity: vi.fn(),
    } as unknown as ReturnType<typeof useEntityCatalog>);
  });

  it("renders nothing when widgetId is empty", () => {
    const { container } = renderSlot({
      kind: "metric-widget",
      widgetId: "",
      entityName: "account",
    });

    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByText("No metric widgets are defined for this entity."),
    ).not.toBeInTheDocument();
  });

  it("shows a loading spinner while the catalog is loading and the widget is unresolved", () => {
    mockUseEntityCatalog.mockReturnValue({
      items: [],
      isLoading: true,
      error: null,
      refresh: vi.fn(),
      getDefinition: vi.fn(),
      isKnownEntity: vi.fn(),
    } as unknown as ReturnType<typeof useEntityCatalog>);

    renderSlot({
      kind: "metric-widget",
      widgetId: "widget-1",
      entityName: "account",
    });

    expect(
      screen.getByRole("status", { name: /Loading metric/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No metric widgets are defined for this entity."),
    ).not.toBeInTheDocument();
  });

  it("renders a quiet empty state when the catalog is ready but the widget is missing", () => {
    const { container } = renderSlot({
      kind: "metric-widget",
      widgetId: "missing-widget",
      entityName: "account",
    });

    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByText("No metric widgets are defined for this entity."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: /Loading metric/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the widget layout when the target resolves", () => {
    renderSlot({
      kind: "metric-widget",
      widgetId: "widget-1",
      entityName: "account",
    });

    expect(screen.getByTestId("metric-widget-layout")).toBeInTheDocument();
    expect(screen.getByText("Widget layout")).toBeInTheDocument();
    expect(
      screen.queryByText("No metric widgets are defined for this entity."),
    ).not.toBeInTheDocument();
    expect(buildLayoutContext).toHaveBeenCalled();
  });
});
