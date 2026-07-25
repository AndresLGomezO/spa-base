import { Bot, Maximize2, Minus, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { IconButton, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { useMdUpMediaQuery } from "../../hooks/use-md-up-media-query";
import { AiChatSessionList } from "./AiChatSessionList";
import { AiChatThread } from "./AiChatThread";
import type { UseAiChatSessionResult } from "./use-ai-chat-session";
import "./ai-chat.css";

export function AiChatPanel({
  chat,
  canRun,
  layout = "popup",
  animateEnter = false,
  className,
  onMinimize,
  onExpand,
}: {
  readonly chat: UseAiChatSessionResult;
  readonly canRun: boolean;
  readonly layout?: "popup" | "page";
  readonly animateEnter?: boolean;
  readonly className?: string;
  readonly onMinimize?: () => void;
  readonly onExpand?: () => void;
}) {
  const { t } = useTranslation("common");
  const isPage = layout === "page";
  const isWideViewport = useMdUpMediaQuery();
  /** Below md, page matches popup: history OR thread (not stacked). */
  const isNarrowPage = isPage && !isWideViewport;
  const showSessionList = isNarrowPage
    ? chat.view === "sessions"
    : isPage || chat.view === "sessions";
  const showThread = isNarrowPage
    ? chat.view === "thread"
    : isPage || chat.view === "thread";
  const showBack = !isPage || isNarrowPage;

  return (
    <div
      className={cn(
        "ai-chat-panel-shell flex min-h-0 flex-col",
        isPage
          ? "h-full min-h-0 flex-1 overflow-hidden"
          : "ai-chat-panel-popup",
        className,
      )}
      data-testid="ai-chat-panel-shell"
      data-animate={animateEnter ? "enter" : undefined}
      data-layout={layout}
      data-narrow-page={isNarrowPage ? "true" : "false"}
    >
      {!isPage ? (
        <header className="ai-chat-panel-header flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="bg-primary/15 text-primary inline-flex size-8 items-center justify-center rounded-full">
              <Bot className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="ai-chat-panel-title truncate text-sm font-semibold">
                {t("aiChat.title")}
              </div>
              <Text className="text-muted-foreground truncate text-xs">
                {t("aiChat.description")}
              </Text>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {onExpand ? (
              <IconButton
                size="sm"
                label={t("aiChat.expandToPage")}
                onClick={onExpand}
              >
                <Maximize2 className="size-4" aria-hidden />
              </IconButton>
            ) : null}
            {onMinimize ? (
              <IconButton
                size="sm"
                label={t("aiChat.minimize")}
                onClick={onMinimize}
              >
                <Minus className="size-4" aria-hidden />
              </IconButton>
            ) : null}
          </div>
        </header>
      ) : null}

      <div
        className={cn(
          "min-h-0 flex-1 p-3",
          isPage &&
            !isNarrowPage &&
            "grid gap-3 overflow-hidden md:grid-cols-[14rem_minmax(0,1fr)] lg:grid-cols-[16rem_minmax(0,1fr)]",
          (isNarrowPage || !isPage) && "flex flex-col overflow-hidden",
        )}
      >
        {showSessionList ? (
          <div
            className={cn(
              "min-h-0 overflow-hidden",
              isPage
                ? "border-border flex flex-col rounded-xl border bg-background/80 p-3"
                : "h-full",
              isPage && !showThread ? "md:col-span-2" : null,
            )}
            data-testid="ai-chat-session-pane"
          >
            <AiChatSessionList
              sessions={chat.sessions}
              loading={chat.sessionsLoading}
              error={chat.sessionsError}
              activeSessionId={chat.activeSessionId}
              isHiding={chat.isHiding}
              onSelect={chat.openSession}
              onNewChat={chat.startNewChat}
              onHide={chat.hideSession}
              compact={!isPage || isNarrowPage}
            />
          </div>
        ) : null}

        {showThread ? (
          <div
            className={cn(
              "min-h-0 overflow-hidden",
              isPage
                ? "border-border flex min-h-0 flex-1 flex-col rounded-xl border bg-background/80 p-3"
                : "h-full",
            )}
            data-testid="ai-chat-thread-pane"
          >
            <AiChatThread
              messages={chat.messages}
              isPending={chat.isPending}
              isStreaming={chat.isStreaming}
              partialAnswer={chat.partialAnswer}
              progressLabel={chat.progressLabel}
              jobStatus={chat.job?.status}
              jobError={chat.jobError}
              submitError={chat.submitError}
              canRun={canRun}
              showBack={showBack}
              onBack={chat.showSessions}
              onAsk={chat.ask}
              density={isPage && !isNarrowPage ? "comfortable" : "compact"}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AiChatFabButton({
  open,
  busy,
  onClick,
  label,
}: {
  readonly open: boolean;
  readonly busy: boolean;
  readonly onClick: () => void;
  readonly label: string;
}) {
  return (
    <button
      type="button"
      className="ai-chat-fab"
      data-open={open ? "true" : "false"}
      data-busy={busy && !open ? "true" : "false"}
      aria-label={label}
      aria-expanded={open}
      onClick={onClick}
    >
      <Bot
        className="ai-chat-fab-icon ai-chat-fab-icon-bot size-6"
        aria-hidden
      />
      <X
        className="ai-chat-fab-icon ai-chat-fab-icon-close size-6"
        aria-hidden
      />
    </button>
  );
}
