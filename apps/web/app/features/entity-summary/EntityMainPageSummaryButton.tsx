import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { UiLayoutSummary } from "@repo/ui-builder-core";
import {
  AiSparkIcon,
  Button,
  Markdown,
  SegmentedSwitch,
  Text,
  useThirdRail,
} from "@repo/ui";

import { getEntity, listEntity } from "../../lib/api-client";
import {
  entityListQueryKey,
  entityRecordQueryKey,
} from "../../query/query-client";
import { summaryChartBlockRenderers } from "./summary-chart-renderers";
import { SummaryCopyMarkdownButton } from "./SummaryCopyMarkdownButton";
import {
  resolveSummaryTabsFromRecord,
  type ResolvedSummaryTab,
} from "./resolve-summary-tabs";

interface EntityMainPageSummaryButtonProps {
  readonly summary: UiLayoutSummary;
}

function SummaryEmptyTabState() {
  const { t } = useTranslation("common");
  return (
    <div
      className="relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border px-4 py-12 text-center"
      style={{
        borderColor: "color-mix(in oklab, #8b5cf6 28%, var(--color-border))",
        backgroundImage:
          "radial-gradient(120% 80% at 100% 0%, color-mix(in oklab, #8b5cf6 14%, transparent), transparent 55%), radial-gradient(90% 70% at 0% 100%, color-mix(in oklab, #22d3ee 10%, transparent), transparent 50%), linear-gradient(color-mix(in oklab, var(--color-muted) 55%, transparent), color-mix(in oklab, var(--color-muted) 25%, transparent))",
        boxShadow:
          "0 0 0 1px color-mix(in oklab, #22d3ee 8%, transparent), 0 12px 32px color-mix(in oklab, #8b5cf6 8%, transparent)",
      }}
    >
      <div
        className="flex size-11 items-center justify-center rounded-full"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, #8b5cf6 22%, transparent), color-mix(in oklab, #22d3ee 18%, transparent))",
          boxShadow: "0 0 24px color-mix(in oklab, #8b5cf6 25%, transparent)",
        }}
      >
        <AiSparkIcon size={22} animated className="text-primary" />
      </div>
      <div className="flex max-w-xs flex-col gap-1">
        <Text className="text-foreground text-sm font-medium">
          {t("entity.summary.emptyTitle")}
        </Text>
        <Text className="text-muted-foreground text-xs leading-relaxed">
          {t("entity.summary.emptyDescription")}
        </Text>
      </div>
    </div>
  );
}

function EntityMainSummaryRailBody({
  tabs,
  activeTextRef,
}: {
  readonly tabs: readonly ResolvedSummaryTab[];
  readonly activeTextRef: { current: string };
}) {
  const { t } = useTranslation("common");
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? "");
  const active = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;

  useEffect(() => {
    activeTextRef.current = active?.text ?? "";
  }, [active, activeTextRef]);

  if (!active) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {tabs.length > 1 ? (
        <div
          className="rounded-xl p-1"
          style={{
            backgroundImage:
              "linear-gradient(90deg, color-mix(in oklab, hsl(var(--primary)) 12%, transparent), color-mix(in oklab, #8b5cf6 14%, transparent), color-mix(in oklab, #22d3ee 12%, transparent))",
            boxShadow:
              "0 0 0 1px color-mix(in oklab, #8b5cf6 18%, var(--color-border))",
          }}
        >
          <SegmentedSwitch
            value={active.id}
            onChange={setActiveTabId}
            ariaLabel={t("entity.summary.tabsAriaLabel")}
            fullWidth
            options={tabs.map((tab) => ({
              value: tab.id,
              label: tab.label,
              ariaLabel: tab.label,
            }))}
          />
        </div>
      ) : null}
      {active.text.length > 0 ? (
        <Markdown blockRenderers={summaryChartBlockRenderers}>
          {active.text}
        </Markdown>
      ) : (
        <SummaryEmptyTabState />
      )}
    </div>
  );
}

export function EntityMainPageSummaryButton({
  summary,
}: EntityMainPageSummaryButtonProps) {
  const { t } = useTranslation("common");
  const { open: openThirdRail } = useThirdRail();

  const sourceEntity = summary.sourceEntity.trim();
  const sourceRecordId = summary.sourceRecordId?.trim() ?? "";

  const recordQuery = useQuery({
    queryKey: sourceRecordId
      ? entityRecordQueryKey(sourceEntity, sourceRecordId)
      : ([
          ...entityListQueryKey(sourceEntity, { summarySource: true }, 1),
        ] as const),
    queryFn: async () => {
      if (sourceRecordId) {
        return getEntity<Record<string, unknown>>(sourceEntity, sourceRecordId);
      }
      const page = await listEntity<Record<string, unknown>>(sourceEntity, {
        limit: 1,
      });
      return page.items[0] ?? null;
    },
    enabled: sourceEntity.length > 0,
  });

  const tabs = useMemo(
    () => resolveSummaryTabsFromRecord(summary, recordQuery.data ?? null),
    [summary, recordQuery.data],
  );

  const activeTextRef = useRef("");

  // Show as soon as layout configures tabs — content may still be empty.
  if (tabs.length === 0) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ai"
      size="sm"
      onClick={() => {
        activeTextRef.current = tabs[0]?.text ?? "";
        openThirdRail({
          title: t("entity.summary.title"),
          headerActions: (
            <SummaryCopyMarkdownButton getText={() => activeTextRef.current} />
          ),
          body: (
            <EntityMainSummaryRailBody
              tabs={tabs}
              activeTextRef={activeTextRef}
            />
          ),
          widths: { base: "full", md: "1/2", lg: "1/3" },
          tone: "ai",
        });
      }}
    >
      <AiSparkIcon size={16} animated className="shrink-0" />
      {t("entity.summary.button")}
    </Button>
  );
}
