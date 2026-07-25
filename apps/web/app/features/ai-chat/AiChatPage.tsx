import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { Alert, BuilderPageShell, Heading, PageLoader, Text } from "@repo/ui";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionFromUrl = searchParams.get("sessionId");
  const appliedSessionRef = useRef<string | null>(null);

  const chat = useAiChatSession({
    enabled: isReady && Boolean(tenantId) && (canRun || canRead),
    canRun,
    canRead,
  });
  const { openSession } = chat;

  useEffect(() => {
    if (!sessionFromUrl || appliedSessionRef.current === sessionFromUrl) {
      return;
    }
    appliedSessionRef.current = sessionFromUrl;
    openSession(sessionFromUrl);
    const next = new URLSearchParams(searchParams);
    next.delete("sessionId");
    setSearchParams(next, { replace: true });
  }, [openSession, searchParams, sessionFromUrl, setSearchParams]);

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
    <div className="flex min-h-0 flex-1 flex-col">
      <BuilderPageShell
        title={t("aiChat.title")}
        subtitle={t("aiChat.description")}
        bodyScrollable={false}
      >
        <AiChatPanel chat={chat} canRun={canRun} layout="page" />
      </BuilderPageShell>
    </div>
  );
}
