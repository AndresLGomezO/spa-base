import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Send } from "lucide-react";

import { Alert, Button, IconButton, Text, Textarea } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import type { AiChatSessionMessage } from "../../lib/api-client";
import { AiChatCitations } from "./AiChatCitations";

export function AiChatThread({
  messages,
  isPending,
  jobStatus,
  jobError,
  submitError,
  canRun,
  showBack,
  onBack,
  onAsk,
  className,
}: {
  readonly messages: readonly AiChatSessionMessage[];
  readonly isPending: boolean;
  readonly jobStatus?: string | null;
  readonly jobError: string | null;
  readonly submitError: unknown;
  readonly canRun: boolean;
  readonly showBack?: boolean;
  readonly onBack?: () => void;
  readonly onAsk: (question: string) => boolean;
  readonly className?: string;
}) {
  const { t } = useTranslation("common");
  const [question, setQuestion] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isPending]);

  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-3", className)}>
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

        {messages.map((message, index) => (
          <div
            key={`${message.role}-${message.createdAt}-${index}`}
            className={cn(
              "rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
              message.role === "user" ? "bg-primary/10 ml-6" : "bg-muted mr-4",
            )}
          >
            <div>{message.content}</div>
            {message.role === "assistant" && message.citations ? (
              <AiChatCitations citations={message.citations} className="mt-2" />
            ) : null}
          </div>
        ))}

        {isPending ? (
          <div className="bg-muted text-muted-foreground mr-4 rounded-2xl px-3 py-2 text-sm">
            {t("aiChat.submitting")}
            {jobStatus ? ` (${jobStatus})` : null}
          </div>
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
