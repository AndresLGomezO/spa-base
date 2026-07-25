import { Bot, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

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
}: {
  readonly chat: UseAiChatSessionResult;
  readonly canRun: boolean;
  readonly layout?: "popup" | "page";
  readonly animateEnter?: boolean;
  readonly className?: string;
}) {
  const { t } = useTranslation("common");
  const isPage = layout === "page";
  const showSessionList = isPage || chat.view === "sessions";
  const showThread = isPage || chat.view === "thread";

  return (
    <div
      className={cn(
        "ai-chat-panel-shell flex min-h-0 flex-col",
        isPage
          ? "h-full min-h-[28rem]"
          : "h-[min(36rem,70vh)] w-[min(26rem,calc(100vw-2rem))]",
        className,
      )}
      data-animate={animateEnter ? "enter" : undefined}
    >
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
      </header>

      <div
        className={cn(
          "min-h-0 flex-1 p-3",
          isPage && "grid gap-3 md:grid-cols-[16rem_minmax(0,1fr)]",
        )}
      >
        {showSessionList ? (
          <div
            className={cn(
              "min-h-0",
              isPage ? "border-border rounded-xl border p-3" : "h-full",
              isPage && !showThread ? "md:col-span-2" : null,
            )}
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
              compact={!isPage}
            />
          </div>
        ) : null}

        {showThread ? (
          <div
            className={cn(
              "min-h-0",
              isPage ? "border-border rounded-xl border p-3" : "h-full",
            )}
          >
            <AiChatThread
              messages={chat.messages}
              isPending={chat.isPending}
              jobStatus={chat.job?.status}
              jobError={chat.jobError}
              submitError={chat.submitError}
              canRun={canRun}
              showBack={!isPage}
              onBack={chat.showSessions}
              onAsk={chat.ask}
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
