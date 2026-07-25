import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TestEntityCatalogProvider } from "../../test/test-entity-catalog-provider";
import { AiChatCitations } from "./AiChatCitations";
import { AiChatThread } from "./AiChatThread";

vi.mock("../../lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("../../lib/api-client")>(
    "../../lib/api-client",
  );
  return {
    ...actual,
    getEntity: vi.fn(async () => ({
      id: "p1",
      name: "Alpha Product",
      description: "Largest by amount",
    })),
  };
});

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TestEntityCatalogProvider>{children}</TestEntityCatalogProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("AiChatThread streaming bubble", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("shows a single pending bubble with typing dots (no duplicate label row)", () => {
    render(
      <AiChatThread
        messages={[]}
        isPending
        progressLabel="Searching financialItem…"
        jobError={null}
        submitError={null}
        canRun
        onAsk={() => false}
      />,
      { wrapper },
    );

    expect(screen.getByTestId("ai-chat-pending-bubble")).toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-typing-dots")).toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-pending-label")).toHaveTextContent(
      "Searching financialItem…",
    );
    expect(screen.getAllByText("Searching financialItem…")).toHaveLength(1);
    expect(
      screen.queryByTestId("ai-chat-streaming-bubble"),
    ).not.toBeInTheDocument();
  });

  it("renders partial answer without repeating the progress label", () => {
    render(
      <AiChatThread
        messages={[]}
        isPending
        isStreaming
        partialAnswer="Your biggest product is **Alpha**"
        progressLabel="Writing answer…"
        jobError={null}
        submitError={null}
        canRun
        onAsk={() => false}
      />,
      { wrapper },
    );

    const bubble = screen.getByTestId("ai-chat-streaming-bubble");
    expect(bubble).toHaveTextContent("Your biggest product is");
    expect(bubble).toHaveClass("ai-chat-bubble");
    expect(screen.queryByText("Writing answer…")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("ai-chat-pending-bubble"),
    ).not.toBeInTheDocument();
  });

  it("applies comfortable density class for page layout", () => {
    const { container } = render(
      <AiChatThread
        messages={[]}
        isPending={false}
        jobError={null}
        submitError={null}
        canRun
        onAsk={() => false}
        density="comfortable"
      />,
      { wrapper },
    );

    expect(container.firstChild).toHaveClass("ai-chat-thread--comfortable");
    expect(container.firstChild).toHaveAttribute("data-density", "comfortable");
  });

  it("renders assistant markdown hit chip with hover preview", async () => {
    render(
      <AiChatThread
        messages={[
          {
            role: "assistant",
            content:
              "### Summary\n\nYour biggest loan is [Préstamo Mami](record:widget/p1).",
            createdAt: new Date().toISOString(),
          },
        ]}
        isPending={false}
        jobError={null}
        submitError={null}
        canRun
        onAsk={() => false}
      />,
      { wrapper },
    );

    const bubble = screen.getByTestId("ai-chat-assistant-bubble");
    expect(bubble).toHaveClass("ai-chat-bubble");
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
      "Summary",
    );
    const hit = screen.getByTestId("ai-chat-record-hit-widget-p1");
    expect(hit).toHaveTextContent("Préstamo Mami");
    expect(hit).toHaveAttribute("href", "/app/widget/p1");
    expect(bubble).not.toHaveTextContent("widget:p1");
    expect(screen.getByTestId("ai-chat-bubble-time")).toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-day-separator")).toHaveTextContent(
      "Today",
    );

    fireEvent.mouseEnter(hit);

    expect(
      await screen.findByTestId("ai-chat-record-hit-preview-widget-p1"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Alpha Product")).toBeInTheDocument();
    });
    expect(screen.getByText("Largest by amount")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      "/app/widget/p1",
    );
  });

  it("inserts day separators when messages span multiple days", () => {
    render(
      <AiChatThread
        messages={[
          {
            role: "user",
            content: "Yesterday question",
            createdAt: "2026-07-24T15:30:00.000Z",
          },
          {
            role: "assistant",
            content: "Yesterday answer",
            createdAt: "2026-07-24T15:31:00.000Z",
          },
          {
            role: "user",
            content: "Today question",
            createdAt: "2026-07-25T18:05:00.000Z",
          },
        ]}
        isPending={false}
        jobError={null}
        submitError={null}
        canRun
        onAsk={() => false}
      />,
      { wrapper },
    );

    const separators = screen.getAllByTestId("ai-chat-day-separator");
    expect(separators.length).toBeGreaterThanOrEqual(2);
    expect(separators.at(-1)).toHaveTextContent("Today");
    expect(screen.getAllByTestId("ai-chat-bubble-time").length).toBe(3);
  });

  it("sanitizes nested record markdown into chips using citations", () => {
    render(
      <AiChatThread
        messages={[
          {
            role: "assistant",
            content:
              "Top product: [Mastercard Black](record:[Mastercard Black](record:Mastercard Black)) — **$23,000,000 COP**",
            createdAt: new Date().toISOString(),
            citations: [
              {
                kind: "entity",
                entityName: "widget",
                recordId: "p1",
                label: "Mastercard Black",
              },
            ],
          },
        ]}
        isPending={false}
        jobError={null}
        submitError={null}
        canRun
        onAsk={() => false}
      />,
      { wrapper },
    );

    const bubble = screen.getByTestId("ai-chat-assistant-bubble");
    expect(bubble).not.toHaveTextContent("record:");
    expect(
      screen.getByTestId("ai-chat-record-hit-widget-p1"),
    ).toHaveTextContent("Mastercard Black");
  });
});

describe("AiChatCitations source rows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps sources collapsed by default and expands on toggle", async () => {
    render(
      <AiChatCitations
        citations={[
          {
            kind: "entity",
            entityName: "widget",
            recordId: "p1",
            label: "Fallback label",
          },
        ]}
      />,
      { wrapper },
    );

    expect(screen.getByTestId("ai-chat-sources-toggle")).toBeInTheDocument();
    expect(
      screen.queryByTestId("ai-chat-source-row-widget-p1"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("ai-chat-sources-toggle"));

    expect(
      await screen.findByTestId("ai-chat-source-row-widget-p1"),
    ).toBeInTheDocument();
    expect(await screen.findByText("Alpha Product")).toBeInTheDocument();
  });
});
