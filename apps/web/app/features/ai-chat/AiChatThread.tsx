import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Send } from "lucide-react";

import { Alert, Button, IconButton, Text, Textarea } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import type { AiChatSessionMessage } from "../../lib/api-client";
import {
  formatAiChatBubbleTime,
  formatAiChatDayLabel,
  localDayKey,
} from "./ai-chat-message-time";
import { AiChatCitations } from "./AiChatCitations";
import { AiChatMarkdown } from "./AiChatMarkdown";
import { AiChatTypingDots } from "./AiChatTypingDots";

function MessageRow({
  role,
  children,
}: {
  readonly role: "user" | "assistant";
  readonly children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full",
        role === "user" ? "justify-end" : "justify-start",
      )}
    >
      {children}
    </div>
  );
}

function DaySeparator({ label }: { readonly label: string }) {
  return (
    <div className="ai-chat-day-separator" data-testid="ai-chat-day-separator">
      <span className="ai-chat-day-separator__label">{label}</span>
    </div>
  );
}

function BubbleTime({
  createdAt,
  locale,
}: {
  readonly createdAt: string;
  readonly locale: string;
}) {
  const label = formatAiChatBubbleTime(createdAt, locale);
  if (!label) {
    return null;
  }
  return (
    <time
      className="ai-chat-bubble-time"
      dateTime={createdAt}
      data-testid="ai-chat-bubble-time"
    >
      {label}
    </time>
  );
}

export function AiChatThread({
  messages,
  isPending,
  isStreaming = false,
  partialAnswer = null,
  progressLabel = null,
  jobError,
  submitError,
  canRun,
  showBack,
  onBack,
  onAsk,
  density = "compact",
  className,
}: {
  readonly messages: readonly AiChatSessionMessage[];
  readonly isPending: boolean;
  readonly isStreaming?: boolean;
  readonly partialAnswer?: string | null;
  readonly progressLabel?: string | null;
  readonly jobStatus?: string | null;
  readonly jobError: string | null;
  readonly submitError: unknown;
  readonly canRun: boolean;
  readonly showBack?: boolean;
  readonly onBack?: () => void;
  readonly onAsk: (question: string) => boolean;
  /** `compact` = FAB popup; `comfortable` = full `/ai/chat` page. */
  readonly density?: "compact" | "comfortable";
  readonly className?: string;
}) {
  const { t, i18n } = useTranslation("common");
  const [question, setQuestion] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const hasPartialAnswer =
    typeof partialAnswer === "string" && partialAnswer.trim().length > 0;
  const showStreamingAnswer = (isPending || isStreaming) && hasPartialAnswer;
  const showPendingStatus = isPending && !hasPartialAnswer && !isStreaming;
  const statusLabel = progressLabel ?? t("aiChat.submitting");
  const locale = i18n.language || "en";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isPending, partialAnswer, progressLabel]);

  let lastDayKey: string | null = null;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col gap-3",
        density === "comfortable" && "ai-chat-thread--comfortable",
        className,
      )}
      data-density={density}
    >
      {showBack ? (
        <div className="flex items-center gap-1">
          <IconButton
            size="sm"
            label={t("aiChat.backToSessions")}
            onClick={onBack}
          >
            <ArrowLeft className="size-4" aria-hidden />
          </IconButton>
          <Text className="text-sm font-medium">
            {t("aiChat.conversation")}
          </Text>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && !isPending ? (
          <Text className="text-muted-foreground text-sm">
            {t("aiChat.emptyThread")}
          </Text>
        ) : null}

        {messages.map((message, index) => {
          const dayKey = localDayKey(message.createdAt);
          const showDaySeparator = dayKey !== lastDayKey;
          lastDayKey = dayKey;
          const dayLabel = showDaySeparator
            ? formatAiChatDayLabel(message.createdAt, locale, {
                today: t("aiChat.dayToday"),
                yesterday: t("aiChat.dayYesterday"),
              })
            : null;

          return (
            <div key={`${message.role}-${message.createdAt}-${index}`}>
              {dayLabel ? <DaySeparator label={dayLabel} /> : null}
              <MessageRow role={message.role}>
                <div
                  className={cn(
                    "ai-chat-bubble rounded-2xl px-3 py-2 text-sm",
                    message.role === "user"
                      ? "bg-primary/10 whitespace-pre-wrap"
                      : "bg-muted",
                  )}
                  data-testid={
                    message.role === "assistant"
                      ? "ai-chat-assistant-bubble"
                      : "ai-chat-user-bubble"
                  }
                >
                  {message.role === "assistant" ? (
                    <AiChatMarkdown citations={message.citations}>
                      {message.content}
                    </AiChatMarkdown>
                  ) : (
                    <div>{message.content}</div>
                  )}
                  {message.role === "assistant" && message.citations ? (
                    <AiChatCitations citations={message.citations} />
                  ) : null}
                  <BubbleTime createdAt={message.createdAt} locale={locale} />
                </div>
              </MessageRow>
            </div>
          );
        })}

        {showStreamingAnswer ? (
          <MessageRow role="assistant">
            <div
              className="ai-chat-bubble ai-chat-streaming-bubble bg-muted rounded-2xl px-3 py-2 text-sm"
              data-testid="ai-chat-streaming-bubble"
            >
              <AiChatMarkdown>{partialAnswer!}</AiChatMarkdown>
              <span className="ai-chat-caret" aria-hidden />
            </div>
          </MessageRow>
        ) : null}

        {showPendingStatus ? (
          <MessageRow role="assistant">
            <div
              className="ai-chat-bubble bg-muted text-muted-foreground flex items-center gap-2 rounded-2xl px-3 py-2 text-sm"
              data-testid="ai-chat-pending-bubble"
            >
              <AiChatTypingDots label={statusLabel} />
              <span data-testid="ai-chat-pending-label">{statusLabel}</span>
            </div>
          </MessageRow>
        ) : null}

        <div ref={endRef} />
      </div>

      {submitError ? <Alert>{t("aiChat.submitError")}</Alert> : null}
      {jobError ? <Alert>{jobError}</Alert> : null}

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (onAsk(question)) {
            setQuestion("");
          }
        }}
      >
        <Textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={3}
          placeholder={t("aiChat.questionPlaceholder")}
          disabled={isPending || !canRun}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isPending || !canRun || question.trim().length === 0}
          >
            <Send className="size-4" aria-hidden />
            {isPending ? t("aiChat.submitting") : t("aiChat.submit")}
          </Button>
        </div>
      </form>
    </div>
  );
}
