import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { AiChatFabButton, AiChatPanel } from "./AiChatPanel";
import { useAiChatSession } from "./use-ai-chat-session";
import "./ai-chat.css";

export function AiChatFab() {
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

  return (
    <div
      className="pointer-events-none fixed right-4 z-[60] flex flex-col items-end gap-3"
      style={{
        bottom: "calc(1rem + var(--app-shell-footer-offset, 0px))",
      }}
      data-testid="ai-chat-fab-anchor"
    >
      {open ? (
        <div className="pointer-events-auto">
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
      ) : null}
      <div className="pointer-events-auto">
        <AiChatFabButton
          open={open}
          busy={chat.isPending}
          label={open ? t("aiChat.closeFab") : t("aiChat.openFab")}
          onClick={() => setOpen((current) => !current)}
        />
      </div>
    </div>
  );
}
