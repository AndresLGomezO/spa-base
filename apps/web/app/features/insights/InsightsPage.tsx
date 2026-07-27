import { useMemo, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Alert,
  BuilderPageShell,
  Heading,
  PageLoader,
  TabbedPanel,
  Text,
} from "@repo/ui";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { InsightSurfaceSection } from "./InsightSurfaceSection";
import { useInsightSurfaces } from "./useInsightSurfaces";

export function InsightsPage() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();
  const canRun = usePermission("ai.chat.run");
  const [searchParams, setSearchParams] = useSearchParams();

  const enabled = isReady && Boolean(tenantId) && canRun;
  const surfacesQuery = useInsightSurfaces({ enabled });

  const orderedSurfaces = useMemo(() => {
    const surfaces = surfacesQuery.data?.surfaces ?? [];
    return [...surfaces].sort((a, b) => a.ui.tabOrder - b.ui.tabOrder);
  }, [surfacesQuery.data?.surfaces]);

  const activeTabId = useMemo(() => {
    const raw = searchParams.get("tab")?.trim();
    if (raw && orderedSurfaces.some((surface) => surface.id === raw)) {
      return raw;
    }
    return orderedSurfaces[0]?.id ?? "";
  }, [orderedSurfaces, searchParams]);

  const tabs = useMemo(() => {
    return orderedSurfaces.map((surface) => ({
      id: surface.id,
      label: surface.labels.title,
      panel: (
        <InsightSurfaceSection
          surface={surface}
          enabled={enabled && activeTabId === surface.id}
        />
      ) as ReactNode,
    }));
  }, [activeTabId, enabled, orderedSurfaces]);

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!canRun) {
    return (
      <div className="space-y-3 p-4">
        <Heading level={1}>{t("insights.pageTitle")}</Heading>
        <Alert>{t("insights.forbidden")}</Alert>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-3 p-4">
        <Heading level={1}>{t("insights.pageTitle")}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  if (surfacesQuery.isLoading) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (surfacesQuery.isError) {
    return (
      <div className="space-y-3 p-4">
        <Heading level={1}>{t("insights.pageTitle")}</Heading>
        <Alert>{t("insights.refreshFailed")}</Alert>
      </div>
    );
  }

  if (orderedSurfaces.length === 0) {
    return (
      <div className="space-y-3 p-4">
        <Heading level={1}>{t("insights.pageTitle")}</Heading>
        <Text className="text-muted-foreground text-sm">
          {t("insights.pageDescription")}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {t("insights.emptyScope")}
        </Text>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-[var(--app-shell-footer-offset,0px)]">
      <BuilderPageShell title={t("nav.insights")}>
        <TabbedPanel
          ariaLabel={t("insights.tabs.ariaLabel")}
          activeTabId={activeTabId}
          onTabChange={(tabId) => {
            const params = new URLSearchParams(searchParams);
            params.set("tab", tabId);
            setSearchParams(params, { replace: true });
          }}
          tabs={tabs}
          className="min-h-0 flex-1"
        />
      </BuilderPageShell>
    </div>
  );
}
