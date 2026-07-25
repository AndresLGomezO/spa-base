import { MessageSquarePlus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Alert, Button, IconButton, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import type { AiChatSessionSummary } from "../../lib/api-client";

export function AiChatSessionList({
  sessions,
  loading,
  error,
  activeSessionId,
  isHiding,
  onSelect,
  onNewChat,
  onHide,
  compact = false,
}: {
  readonly sessions: readonly AiChatSessionSummary[];
  readonly loading: boolean;
  readonly error: boolean;
  readonly activeSessionId: string | null;
  readonly isHiding: boolean;
  readonly onSelect: (sessionId: string) => void;
  readonly onNewChat: () => void;
  readonly onHide: (sessionId: string) => void;
  readonly compact?: boolean;
}) {
  const { t } = useTranslation("common");

  return (
    <div
      className={cn("flex h-full min-h-0 flex-col gap-3", compact && "gap-2")}
    >
      <div className="flex items-center justify-between gap-2">
        <Text className="font-medium">{t("aiChat.sessionsTitle")}</Text>
        <Button type="button" size="sm" onClick={onNewChat}>
          <MessageSquarePlus className="size-4" aria-hidden />
          {t("aiChat.newChat")}
        </Button>
      </div>

      {error ? <Alert>{t("aiChat.sessionsLoadError")}</Alert> : null}

      {loading ? (
        <Text className="text-muted-foreground text-sm">
          {t("aiChat.sessionsLoading")}
        </Text>
      ) : null}

      {!loading && sessions.length === 0 ? (
        <Text className="text-muted-foreground text-sm">
          {t("aiChat.sessionsEmpty")}
        </Text>
      ) : null}

      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          return (
            <li key={session.id}>
              <div
                className={cn(
                  "group flex items-start gap-1 rounded-lg border border-transparent px-2 py-2 transition-colors",
                  isActive ? "border-border bg-muted/80" : "hover:bg-hover/70",
                )}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onSelect(session.id)}
                >
                  <div className="truncate text-sm font-medium">
                    {session.preview || t("aiChat.untitledSession")}
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {t("aiChat.sessionMeta", {
                      count: session.messageCount,
                      updatedAt: new Date(session.updatedAt).toLocaleString(),
                    })}
                  </div>
                </button>
                <IconButton
                  size="sm"
                  label={t("aiChat.hideSession")}
                  disabled={isHiding}
                  className="opacity-70 group-hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (window.confirm(t("aiChat.hideSessionConfirm"))) {
                      onHide(session.id);
                    }
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                </IconButton>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
