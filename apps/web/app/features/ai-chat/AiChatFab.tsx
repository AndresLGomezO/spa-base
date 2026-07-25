import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { AiChatFabButton, AiChatPanel } from "./AiChatPanel";
import { useAiChatSession } from "./use-ai-chat-session";
import "./ai-chat.css";

export function AiChatFab() {
  const { t } = useTranslation("common");
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

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex flex-col items-end gap-3">
      {open ? (
        <div className="pointer-events-auto">
          <AiChatPanel
            chat={chat}
            canRun={canRun}
            layout="popup"
            animateEnter
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
