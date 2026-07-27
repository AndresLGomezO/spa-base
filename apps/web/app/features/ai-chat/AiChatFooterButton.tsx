import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import type { AiChatComponentConfig } from "@repo/ui-builder-core";
import { Popover } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { AiChatFabButton, AiChatPanel } from "./AiChatPanel";
import { useAiChatSession } from "./use-ai-chat-session";
import "./ai-chat.css";

interface AiChatFooterButtonProps {
  readonly config?: Pick<
    AiChatComponentConfig,
    "iconName" | "iconSize" | "busyIndicator"
  >;
  readonly className?: string;
}

export function AiChatFooterButton({
  config,
  className,
}: AiChatFooterButtonProps) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isReady, tenantId } = useAuth();
  const canRun = usePermission("ai.chat.run");
  const canRead = usePermission("ai.chat.read");
  const [open, setOpen] = useState(false);

  const enabled = isReady && Boolean(tenantId) && (canRun || canRead);
  const chat = useAiChatSession({
    enabled,
    canRun,
    canRead,
  });

  if (!enabled || !canRun) {
    return null;
  }

  // Full page chat already owns the conversation chrome.
  if (pathname.startsWith("/ai/chat")) {
    return null;
  }

  const busy = config?.busyIndicator !== false ? chat.isPending : false;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="top-end"
      layer="elevated"
      panelClassName="w-auto max-w-none overflow-visible border-0 bg-transparent p-0 shadow-none"
      className={cn(
        "inline-flex w-fit max-w-full overflow-visible p-1.5",
        className,
      )}
      trigger={
        <AiChatFabButton
          open={open}
          busy={busy}
          iconName={config?.iconName ?? "Bot"}
          iconSize={config?.iconSize}
          label={open ? t("aiChat.closeFab") : t("aiChat.openFab")}
        />
      }
    >
      <div data-testid="ai-chat-footer-panel">
        <AiChatPanel
          chat={chat}
          canRun={canRun}
          layout="popup"
          animateEnter
          onMinimize={() => setOpen(false)}
          onExpand={() => {
            const sessionId = chat.activeSessionId;
            setOpen(false);
            void navigate(
              sessionId
                ? `/ai/chat?sessionId=${encodeURIComponent(sessionId)}`
                : "/ai/chat",
            );
          }}
        />
      </div>
    </Popover>
  );
}
