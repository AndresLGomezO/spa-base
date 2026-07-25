import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AiChatFab } from "./AiChatFab";
import { AiChatPanel } from "./AiChatPanel";
import type { UseAiChatSessionResult } from "./use-ai-chat-session";

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    isReady: true,
    tenantId: "tenant-1",
  }),
}));

vi.mock("../../auth/usePermission", () => ({
  usePermission: () => true,
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

describe("AiChatFab mobile shell", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    vi.clearAllMocks();
  });

  it("offsets the FAB above the footer CSS variable", () => {
    render(
      <MemoryRouter>
        <AiChatFab />
      </MemoryRouter>,
    );

    const anchor = screen.getByTestId("ai-chat-fab-anchor");
    expect(anchor.style.bottom).toBe(
      "calc(1rem + var(--app-shell-footer-offset, 0px))",
    );
  });

  it("hides the FAB on the full AI chat page", () => {
    render(
      <MemoryRouter initialEntries={["/ai/chat"]}>
        <AiChatFab />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("ai-chat-fab-anchor")).not.toBeInTheDocument();
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
