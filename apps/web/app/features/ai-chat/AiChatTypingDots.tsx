import { useTranslation } from "react-i18next";

import { cn } from "@repo/theme/utils";

export function AiChatTypingDots({
  className,
  label,
}: {
  readonly className?: string;
  readonly label?: string;
}) {
  const { t } = useTranslation("common");
  const ariaLabel = label ?? t("aiChat.submitting");

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={cn(
        "ai-chat-typing-dots inline-flex items-center gap-1",
        className,
      )}
      data-testid="ai-chat-typing-dots"
    >
      <span className="ai-chat-typing-dot" style={{ animationDelay: "0ms" }} />
      <span
        className="ai-chat-typing-dot"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="ai-chat-typing-dot"
        style={{ animationDelay: "300ms" }}
      />
    </span>
  );
}
