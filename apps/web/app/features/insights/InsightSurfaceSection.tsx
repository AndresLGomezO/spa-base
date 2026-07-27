import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Heading,
  Markdown,
  MonthYearPicker,
  Text,
  type DatePickerLabels,
} from "@repo/ui";
import { RefreshCw } from "lucide-react";

import type { InsightSurfaceDescriptor } from "../../lib/api-client";
import { InsightsSectionShell } from "./InsightsSectionShell";
import { InsightSurfaceCard } from "./InsightSurfaceCard";
import {
  useInsightSurface,
  useRefreshInsightSurface,
} from "./useInsightSurface";

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
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

export function InsightSurfaceSection({
  surface,
  enabled,
}: {
  readonly surface: InsightSurfaceDescriptor;
  readonly enabled: boolean;
}) {
  const { t, i18n } = useTranslation("common");
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = surface.scope.queryParam;

  const scope = useMemo(() => {
    const raw = searchParams.get(queryParam)?.trim();
    if (raw && /^\d{4}-\d{2}$/.test(raw)) {
      return raw;
    }
    return currentMonth();
  }, [queryParam, searchParams]);

  const insightsQuery = useInsightSurface({
    surfaceId: surface.id,
    scope,
    enabled,
  });
  const { refresh, refreshing } = useRefreshInsightSurface({
    surfaceId: surface.id,
    scope,
    enabled,
  });

  const scopeLabels: DatePickerLabels = useMemo(
    () => ({
      placeholder: t("insights.scopeLabel"),
      previous: t("viewFilterComponents.dateFilterPrevious"),
      next: t("viewFilterComponents.dateFilterNext"),
      selectYear: t("viewFilterComponents.dateFilterSelectYear"),
      selectMonth: t("viewFilterComponents.dateFilterSelectMonth"),
      openCalendar: t("viewFilterComponents.dateFilterOpenCalendar"),
      clear: t("viewFilterComponents.dateFilterClear"),
    }),
    [t],
  );

  const data = insightsQuery.data;
  const labels = data?.labels ?? surface.labels;
  const summaryFields = data?.summaryFields ?? surface.summaryFields;
  const linkFields = data?.linkFields ?? surface.linkFields;
  const summary = data?.summary;
  const hasSummary =
    summary != null &&
    summaryFields.some((field) => summary[field.path] != null);

  const refreshLabel = refreshing
    ? t("insights.refreshing")
    : (labels.refreshAction ?? t("insights.refresh"));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-xs space-y-1">
          <Text className="text-muted-foreground text-xs font-medium">
            {t("insights.scopeLabel")}
          </Text>
          <MonthYearPicker
            value={scope}
            onChange={(next) => {
              const params = new URLSearchParams(searchParams);
              params.set(queryParam, next);
              setSearchParams(params, { replace: true });
            }}
            locale={i18n.language}
            labels={scopeLabels}
            compact
          />
        </div>
        <Button
          type="button"
          variant="ai"
          size="sm"
          disabled={refreshing}
          onClick={() => {
            refresh();
          }}
          data-testid={`insight-surface-refresh-${surface.id}`}
        >
          <RefreshCw
            className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
            aria-hidden
          />
          {refreshLabel}
        </Button>
      </div>

      <InsightsSectionShell
        isLoading={insightsQuery.isLoading}
        isError={insightsQuery.isError}
        isEmpty={!data || data.insights.length === 0}
        loadingLabel={t("loading")}
        errorMessage={t("insights.refreshFailed")}
        emptyMessage={labels.emptyScope ?? t("insights.emptyScope")}
        emptyTestId={`insight-surface-empty-${surface.id}`}
        summary={
          hasSummary && summary ? (
            <section
              className="bg-muted/40 grid gap-3 rounded-xl border p-4 sm:grid-cols-3"
              data-testid={`insight-surface-summary-${surface.id}`}
              aria-label={labels.title}
            >
              {summaryFields.map((field) => (
                <div key={field.path}>
                  <Text className="text-muted-foreground text-xs">
                    {labels.summary[field.labelKey] ?? field.labelKey}
                  </Text>
                  <Text className="text-foreground text-base font-semibold">
                    {formatSummaryValue(
                      summary[field.path],
                      field.format,
                      data?.currency,
                      i18n.language,
                    )}
                  </Text>
                </div>
              ))}
            </section>
          ) : null
        }
      >
        {data && data.insights.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {data.insights.map((insight) => (
              <InsightSurfaceCard
                key={insight.recordId}
                insight={insight}
                linkFields={linkFields}
              />
            ))}
          </div>
        ) : null}

        {data?.portfolioNarrative ? (
          <section
            className="bg-card border-border space-y-2 rounded-xl border p-4"
            data-testid={`insight-surface-portfolio-${surface.id}`}
          >
            <Heading level={3} className="text-sm">
              {labels.portfolioNarrativeTitle ??
                t("insights.portfolioNarrativeFallback")}
            </Heading>
            <Markdown className="text-muted-foreground text-sm leading-relaxed">
              {data.portfolioNarrative}
            </Markdown>
          </section>
        ) : null}
      </InsightsSectionShell>
    </div>
  );
}
