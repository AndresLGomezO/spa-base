import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AiChatFooterButton } from "./AiChatFooterButton";
import { AiChatPanel } from "./AiChatPanel";
import type { UseAiChatSessionResult } from "./use-ai-chat-session";

const usePermissionMock = vi.fn(() => true);

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    isReady: true,
    tenantId: "tenant-1",
  }),
}));

vi.mock("../../auth/usePermission", () => ({
  usePermission: () => usePermissionMock(),
}));

const ask = vi.fn(() => false);
const openSession = vi.fn();
const startNewChat = vi.fn();
const showSessions = vi.fn();
const hideSession = vi.fn();

function createChat(
  overrides: Partial<UseAiChatSessionResult> = {},
): UseAiChatSessionResult {
  return {
    view: "sessions",
    sessions: [],
    sessionsLoading: false,
    sessionsError: false,
    session: undefined,
    activeSessionId: null,
    messages: [],
    job: undefined,
    jobError: null,
    isPending: false,
    isStreaming: false,
    partialAnswer: null,
    progressLabel: null,
    submitError: null,
    ask,
    startNewChat,
    openSession,
    showSessions,
    hideSession,
    isHiding: false,
    refreshSessions: vi.fn(),
    ...overrides,
  };
}

vi.mock("./use-ai-chat-session", () => ({
  useAiChatSession: () => createChat(),
}));

describe("AiChatFooterButton", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    usePermissionMock.mockReturnValue(true);
    vi.clearAllMocks();
  });

  it("renders the chat trigger button", () => {
    render(
      <MemoryRouter>
        <AiChatFooterButton />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("ai-chat-fab-button")).toBeInTheDocument();
  });

  it("opens the popup panel on click", () => {
    render(
      <MemoryRouter>
        <AiChatFooterButton />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId("ai-chat-fab-button"));

    expect(screen.getByTestId("ai-chat-footer-panel")).toBeInTheDocument();
  });

  it("sizes the portal panel to the chat content for top-end placement", () => {
    render(
      <MemoryRouter>
        <AiChatFooterButton />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId("ai-chat-fab-button"));

    const panel = document.querySelector("[data-popover-panel]");
    expect(panel).toBeTruthy();
    expect(panel).toHaveClass("w-auto", "max-w-none");
  });

  it("keeps overflow visible and padding around the trigger for scale/shadow", () => {
    const { container } = render(
      <MemoryRouter>
        <AiChatFooterButton />
      </MemoryRouter>,
    );

    const root = container.firstElementChild;
    expect(root).toHaveClass("overflow-visible", "p-1.5");
  });

  it("hides the button without ai.chat.run permission", () => {
    usePermissionMock.mockReturnValue(false);

    render(
      <MemoryRouter>
        <AiChatFooterButton />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("ai-chat-fab-button")).not.toBeInTheDocument();
  });

  it("hides the button on the full AI chat page", () => {
    render(
      <MemoryRouter initialEntries={["/ai/chat"]}>
        <AiChatFooterButton />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("ai-chat-fab-button")).not.toBeInTheDocument();
  });
});

describe("AiChatPanel page layout", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  function mockMdUp(matches: boolean) {
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
      const isMd =
        query.includes("min-width: 768px") || query.includes("min-width:768px");
      return {
        matches: isMd ? matches : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as MediaQueryList;
    });
  }

  it("uses exclusive history/thread panes on narrow page layout", () => {
    mockMdUp(false);

    const { rerender } = render(
      <AiChatPanel
        chat={createChat({ view: "sessions" })}
        canRun
        layout="page"
      />,
    );

    expect(screen.getByTestId("ai-chat-panel-shell")).toHaveAttribute(
      "data-narrow-page",
      "true",
    );
    expect(screen.getByTestId("ai-chat-session-pane")).toBeInTheDocument();
    expect(screen.queryByTestId("ai-chat-thread-pane")).not.toBeInTheDocument();

    rerender(
      <AiChatPanel
        chat={createChat({ view: "thread" })}
        canRun
        layout="page"
      />,
    );

    expect(
      screen.queryByTestId("ai-chat-session-pane"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-thread-pane")).toBeInTheDocument();
    expect(screen.getByLabelText("Back to chats")).toBeInTheDocument();
  });

  it("shows history and thread side by side on wide page layout", () => {
    mockMdUp(true);

    render(
      <AiChatPanel
        chat={createChat({ view: "sessions" })}
        canRun
        layout="page"
      />,
    );

    expect(screen.getByTestId("ai-chat-panel-shell")).toHaveAttribute(
      "data-narrow-page",
      "false",
    );
    expect(screen.getByTestId("ai-chat-session-pane")).toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-thread-pane")).toBeInTheDocument();
  });
});
