import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { CalendarClock, Lightbulb, Package, Sparkles } from "lucide-react";
import { Heading, Text } from "@repo/ui";
import type { MetricWidgetComponentConfig } from "@repo/ui-builder-core";
import {
  filterComponentInnerStyleRules,
  layoutInlineStyleFromStyleRules,
  resolveMetricWidgetShellClassName,
  splitStyleRuleClasses,
} from "@repo/ui-builder-core";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import type {
  InsightSurfaceDescriptor,
  InsightSurfacePayload,
} from "../../lib/api-client";
import type { DashboardDateFilterContextValue } from "../../lib/metric-binding-resolution";
import { InsightSurfaceCard } from "./InsightSurfaceCard";
import { useInsightSurface } from "./useInsightSurface";
import { useInsightSurfaces } from "./useInsightSurfaces";

const DEFAULT_TOP_N = 3;

const SURFACE_ICONS: Readonly<Record<string, typeof Lightbulb>> = {
  spending: Lightbulb,
  payments: CalendarClock,
  products: Package,
  Lightbulb,
  CalendarClock,
  Package,
  Sparkles,
};

function SurfaceIcon({
  surfaceId,
  iconName,
  className,
}: {
  readonly surfaceId: string;
  readonly iconName?: string;
  readonly className?: string;
}) {
  const Icon =
    (iconName ? SURFACE_ICONS[iconName] : undefined) ||
    SURFACE_ICONS[surfaceId] ||
    Sparkles;
  return <Icon className={className} aria-hidden />;
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function resolveScope(
  dashboardDateFilter: DashboardDateFilterContextValue | undefined,
): string {
  const raw = dashboardDateFilter?.value?.trim();
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    return raw;
  }
  return currentMonth();
}

function formatSummaryValue(
  value: number | undefined,
  format: "currency" | "number" | "count",
  currency: string | undefined,
  locale: string,
): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  if (format === "count") {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
      value,
    );
  }
  if (format === "currency") {
    try {
      return new Intl.NumberFormat(locale, {
        style: currency ? "currency" : "decimal",
        ...(currency ? { currency } : {}),
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return String(value);
    }
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
    value,
  );
}

function ActiveSurfacePanel({
  surface,
  scope,
  topN,
  showSummary,
  enabled,
}: {
  readonly surface: InsightSurfaceDescriptor;
  readonly scope: string;
  readonly topN: number;
  readonly showSummary: boolean;
  readonly enabled: boolean;
}) {
  const { t, i18n } = useTranslation("common");
  const query = useInsightSurface({
    surfaceId: surface.id,
    scope,
    enabled,
  });

  const data = query.data;
  const labels = data?.labels ?? surface.labels;
  const linkFields = data?.linkFields ?? surface.linkFields;
  const summaryFields = data?.summaryFields ?? surface.summaryFields;
  const summary = data?.summary;
  const insights = (data?.insights ?? []).slice(0, topN);
  const hasSummary =
    showSummary &&
    summary != null &&
    summaryFields.some((field) => summary[field.path] != null);

  const seeAllHref = `/ai/insights?tab=${encodeURIComponent(surface.id)}&${encodeURIComponent(surface.scope.queryParam)}=${encodeURIComponent(scope)}`;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3 transition-opacity duration-150"
      data-testid={`unified-insights-panel-${surface.id}`}
    >
      <div className="flex items-center justify-between gap-2">
        <Text className="text-muted-foreground text-xs">
          {labels.description ?? t("insights.pageDescription")}
        </Text>
        <Link
          to={seeAllHref}
          className="text-primary shrink-0 text-xs font-semibold hover:underline"
          data-testid={`unified-insights-see-all-${surface.id}`}
        >
          {labels.seeAll ?? t("insights.seeAll")}
        </Link>
      </div>

      {query.isLoading ? (
        <div
          className="grid gap-2 sm:grid-cols-2 md:grid-cols-3"
          data-testid={`unified-insights-loading-${surface.id}`}
        >
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="bg-muted/60 h-28 animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : null}

      {query.isError ? (
        <Text className="text-destructive text-sm">
          {t("insights.refreshFailed")}
        </Text>
      ) : null}

      {!query.isLoading && !query.isError && insights.length === 0 ? (
        <div
          className="border-border/60 bg-muted/30 flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center"
          data-testid={`unified-insights-empty-${surface.id}`}
        >
          <SurfaceIcon
            surfaceId={surface.id}
            iconName={surface.icon}
            className="text-muted-foreground/70 size-8"
          />
          <Text className="text-muted-foreground text-sm">
            {labels.emptyScope ?? t("insights.emptyScope")}
          </Text>
        </div>
      ) : null}

      {insights.length > 0 ? (
        <div
          key={surface.id}
          className="grid min-h-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3"
        >
          {insights.map((insight) => (
            <InsightSurfaceCard
              key={insight.recordId}
              insight={insight}
              linkFields={linkFields}
              compact
            />
          ))}
        </div>
      ) : null}

      {hasSummary && summary ? (
        <SummaryStrip
          surfaceId={surface.id}
          labels={labels}
          summaryFields={summaryFields}
          summary={summary}
          currency={data?.currency}
          locale={i18n.language}
        />
      ) : null}
    </div>
  );
}

function SummaryStrip({
  surfaceId,
  labels,
  summaryFields,
  summary,
  currency,
  locale,
}: {
  readonly surfaceId: string;
  readonly labels: InsightSurfaceDescriptor["labels"];
  readonly summaryFields: InsightSurfaceDescriptor["summaryFields"];
  readonly summary: InsightSurfacePayload["summary"];
  readonly currency: string | undefined;
  readonly locale: string;
}) {
  const fields = summaryFields.slice(0, 3);
  if (fields.length === 0) {
    return null;
  }

  return (
    <section
      className="border-border/70 bg-muted/35 grid gap-2 rounded-xl border p-3 sm:grid-cols-3"
      data-testid={`unified-insights-summary-${surfaceId}`}
      aria-label={labels.title}
    >
      {fields.map((field) => (
        <div key={field.path} className="min-w-0">
          <Text className="text-muted-foreground text-[0.7rem] font-medium tracking-wide uppercase">
            {labels.summary[field.labelKey] ?? field.labelKey}
          </Text>
          <Text className="text-foreground truncate text-sm font-semibold">
            {formatSummaryValue(
              summary[field.path],
              field.format,
              currency,
              locale,
            )}
          </Text>
        </div>
      ))}
    </section>
  );
}

export function UnifiedInsightsCard({
  config,
  dashboardDateFilter,
}: {
  readonly config: MetricWidgetComponentConfig;
  readonly dashboardDateFilter?: DashboardDateFilterContextValue;
}) {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();
  const canList = usePermission("ai.chat.run");
  const enabled = isReady && Boolean(tenantId) && canList;
  const surfacesQuery = useInsightSurfaces({ enabled });
  const scope = resolveScope(dashboardDateFilter);
  const topN = DEFAULT_TOP_N;
  const showSummary = true;

  const surfaces = useMemo(() => {
    const all = surfacesQuery.data?.surfaces ?? [];
    return [...all]
      .filter((surface) => surface.ui.showInHome)
      .sort((a, b) => a.ui.homeOrder - b.ui.homeOrder);
  }, [surfacesQuery.data?.surfaces]);

  const [activeSurfaceId, setActiveSurfaceId] = useState<string | null>(null);

  const resolvedActiveId = useMemo(() => {
    if (
      activeSurfaceId &&
      surfaces.some((surface) => surface.id === activeSurfaceId)
    ) {
      return activeSurfaceId;
    }
    return surfaces[0]?.id ?? "";
  }, [activeSurfaceId, surfaces]);

  const activeSurface = surfaces.find(
    (surface) => surface.id === resolvedActiveId,
  );

  const innerStyles = filterComponentInnerStyleRules(config.styles);
  const { containerClassName } = splitStyleRuleClasses(innerStyles);
  const containerStyle = layoutInlineStyleFromStyleRules(innerStyles);
  const shellClassName = resolveMetricWidgetShellClassName(config.styles);

  if (!enabled) {
    return null;
  }

  return (
    <section
      className={[
        "bg-card border-border relative flex h-[423px] min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl border shadow-[var(--shadow-card)]",
        shellClassName,
        containerClassName,
      ]
        .filter(Boolean)
        .join(" ")}
      style={containerStyle}
      data-testid="unified-insights-card"
      aria-label={t("nav.insights")}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"
        aria-hidden
      />

      <div className="relative flex min-h-0 flex-1 flex-col gap-3 p-4 md:p-5">
        <header className="flex items-center gap-2.5">
          <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <Heading level={2} className="text-base leading-tight">
            {t("nav.insights")}
          </Heading>
        </header>

        {surfacesQuery.isLoading ? (
          <div
            className="space-y-3"
            data-testid="unified-insights-card-loading"
          >
            <div className="bg-muted h-8 w-full animate-pulse rounded-full" />
            <div className="grid gap-2 sm:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="bg-muted h-28 animate-pulse rounded-xl"
                />
              ))}
            </div>
          </div>
        ) : null}

        {surfacesQuery.isError ? (
          <Text className="text-destructive text-sm">
            {t("insights.refreshFailed")}
          </Text>
        ) : null}

        {!surfacesQuery.isLoading &&
        !surfacesQuery.isError &&
        surfaces.length === 0 ? (
          <div
            className="border-border/60 bg-muted/30 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center"
            data-testid="unified-insights-card-empty"
          >
            <Sparkles className="text-muted-foreground/70 size-8" aria-hidden />
            <Text className="text-muted-foreground text-sm">
              {t("insights.emptyScope")}
            </Text>
          </div>
        ) : null}

        {surfaces.length > 0 ? (
          <>
            <div
              role="tablist"
              aria-label={t("insights.tabs.ariaLabel")}
              className="bg-muted/50 flex w-full gap-1 rounded-full p-1"
              data-testid="unified-insights-tabs"
            >
              {surfaces.map((surface) => {
                const isActive = surface.id === resolvedActiveId;
                return (
                  <button
                    key={surface.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    data-testid={`unified-insights-tab-${surface.id}`}
                    className={[
                      "inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                    onClick={() => {
                      setActiveSurfaceId(surface.id);
                    }}
                  >
                    <SurfaceIcon
                      surfaceId={surface.id}
                      iconName={surface.icon}
                      className="size-3.5 shrink-0"
                    />
                    <span className="truncate">{surface.labels.title}</span>
                  </button>
                );
              })}
            </div>

            {activeSurface ? (
              <ActiveSurfacePanel
                key={activeSurface.id}
                surface={activeSurface}
                scope={scope}
                topN={topN}
                showSummary={showSummary}
                enabled={enabled && resolvedActiveId === activeSurface.id}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
