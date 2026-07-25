import { Alert, Heading, PageLoader, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { AiChatPanel } from "./AiChatPanel";
import { useAiChatSession } from "./use-ai-chat-session";
import "./ai-chat.css";

export function AiChatPage() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();
  const canRun = usePermission("ai.chat.run");
  const canRead = usePermission("ai.chat.read");

  const chat = useAiChatSession({
    enabled: isReady && Boolean(tenantId) && (canRun || canRead),
    canRun,
    canRead,
  });

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!canRun) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("aiChat.title")}</Heading>
        <Alert>{t("aiChat.forbidden")}</Alert>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("aiChat.title")}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full min-h-[32rem] w-full max-w-5xl flex-col gap-4">
      <AiChatPanel chat={chat} canRun={canRun} layout="page" />
    </div>
  );
}
