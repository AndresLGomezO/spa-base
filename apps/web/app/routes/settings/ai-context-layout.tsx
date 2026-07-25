import { NavLink, Outlet, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Alert, Heading, PageLoader, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";

function tabClassName(active: boolean): string {
  return cn(
    "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
    active
      ? "border-primary text-foreground"
      : "text-muted-foreground hover:text-foreground border-transparent",
  );
}

export default function SettingsAiContextLayoutRoute() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();
  const location = useLocation();

  const canReadSections = usePermission("aiContextSection.read");
  const canReadTemplates = usePermission("aiRecordSummaryTemplate.read");
  const canAccess = canReadSections || canReadTemplates;

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!canAccess) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("aiContext.navTitle")}</Heading>
        <Alert>{t("aiContext.forbidden")}</Alert>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("aiContext.navTitle")}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  const tabs = [
    ...(canReadSections
      ? [
          {
            id: "sections",
            to: "/settings/ai-context/sections",
            label: t("aiContext.tabs.sections"),
          },
        ]
      : []),
    ...(canReadTemplates
      ? [
          {
            id: "record-summaries",
            to: "/settings/ai-context/record-summaries",
            label: t("aiContext.tabs.recordSummaries"),
          },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="space-y-1">
        <Heading level={1}>{t("aiContext.navTitle")}</Heading>
        <Text className="text-muted-foreground text-sm">
          {t("aiContext.description")}
        </Text>
      </div>

      <div
        role="tablist"
        aria-label={t("aiContext.navTitle")}
        className="border-border flex shrink-0 gap-1 border-b"
      >
        {tabs.map((tab) => {
          const active =
            location.pathname === tab.to ||
            location.pathname.startsWith(`${tab.to}/`);
          return (
            <NavLink
              key={tab.id}
              to={tab.to}
              role="tab"
              aria-selected={active}
              className={tabClassName(active)}
            >
              {tab.label}
            </NavLink>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
