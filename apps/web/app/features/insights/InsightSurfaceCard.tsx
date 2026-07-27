import { useTranslation } from "react-i18next";
import { Markdown, Text } from "@repo/ui";

import type { InsightSurfacePayload } from "../../lib/api-client";
import { InsightRecordLink } from "./InsightRecordLink";

type InsightRecord = InsightSurfacePayload["insights"][number];
type LinkField = InsightSurfacePayload["linkFields"][number];

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

export function InsightSurfaceCard({
  insight,
  linkFields,
  compact = false,
}: {
  readonly insight: InsightRecord;
  readonly linkFields: readonly LinkField[];
  readonly compact?: boolean;
}) {
  const { t } = useTranslation("common");
  const plainPreview = insight.narrative
    ? truncate(insight.narrative.replace(/[#*_`>\-()[\]]/g, " "), 180)
    : null;

  return (
    <article
      className={
        compact
          ? "bg-card border-border flex min-w-0 w-full flex-col gap-2 rounded-xl border p-3 shadow-sm"
          : "bg-card border-border flex flex-col gap-2 rounded-xl border p-4 shadow-sm"
      }
      data-testid={`insight-card-${insight.recordId}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Text className="text-foreground text-sm font-medium leading-snug">
            {insight.title}
          </Text>
          {linkFields.map((linkField) => {
            const recordId = insight.links[linkField.field];
            if (!recordId) return null;
            return (
              <InsightRecordLink
                key={linkField.field}
                entityName={linkField.entity}
                recordId={recordId}
              />
            );
          })}
        </div>
        {insight.rank != null ? (
          <span
            className="bg-primary/10 text-primary shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
            aria-label={t("insights.rankLabel", { rank: insight.rank })}
          >
            #{insight.rank}
          </span>
        ) : null}
      </div>
      {insight.impactScore != null ? (
        <Text className="text-muted-foreground text-xs">
          {t("insights.impactLabel", {
            score: insight.impactScore.toFixed(2),
          })}
        </Text>
      ) : null}
      {compact && plainPreview ? (
        <Text className="text-muted-foreground text-xs leading-relaxed">
          {plainPreview}
        </Text>
      ) : null}
      {!compact && insight.narrative ? (
        <Markdown className="text-muted-foreground text-sm leading-relaxed">
          {insight.narrative}
        </Markdown>
      ) : null}
    </article>
  );
}
