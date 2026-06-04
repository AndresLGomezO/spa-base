import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { EntityIndexPlanSummary } from "@repo/firestore-indexes";
import { Card, Text } from "@repo/ui";

import {
  planEntityIndexesFromDraft,
  type PlanEntityIndexesInput,
} from "./plan-entity-indexes";

interface EntityIndexPlanSummaryCardProps {
  readonly planInput: PlanEntityIndexesInput;
}

function SummaryChip({
  label,
  value,
}: {
  readonly label: string;
  readonly value: number;
}) {
  if (value === 0) {
    return null;
  }

  return (
    <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs">
      <span>{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </span>
  );
}

function IndexPlanBreakdown({
  summary,
}: {
  readonly summary: EntityIndexPlanSummary;
}) {
  const { t } = useTranslation("common");

  return (
    <div className="flex flex-wrap gap-2">
      <SummaryChip
        label={t("dataModels.indexPlan.categories.ownershipBaseline")}
        value={summary.ownershipBaseline}
      />
      <SummaryChip
        label={t("dataModels.indexPlan.categories.ownershipFk")}
        value={summary.ownershipFk}
      />
      <SummaryChip
        label={t("dataModels.indexPlan.categories.findByField")}
        value={summary.findByField}
      />
      <SummaryChip
        label={t("dataModels.indexPlan.categories.sortOnly")}
        value={summary.sortOnly}
      />
      <SummaryChip
        label={t("dataModels.indexPlan.categories.filterOnly")}
        value={summary.filterOnly}
      />
    </div>
  );
}

export function EntityIndexPlanSummaryCard({
  planInput,
}: EntityIndexPlanSummaryCardProps) {
  const { t } = useTranslation("common");

  const plan = useMemo(
    () => planEntityIndexesFromDraft(planInput),
    [planInput],
  );

  if (!plan) {
    return null;
  }

  return (
    <Card className="space-y-3 p-4">
      <div>
        <Text className="font-medium">
          {t("dataModels.indexPlan.entityTitle")}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {t("dataModels.indexPlan.entityDescription")}
        </Text>
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        <Text className="text-2xl font-semibold tabular-nums">
          {plan.summary.total}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {t("dataModels.indexPlan.totalLabel")}
        </Text>
        <Text className="text-muted-foreground w-full text-xs">
          {t("dataModels.indexPlan.collectionHint", {
            collection: plan.collection,
          })}
        </Text>
      </div>
      <IndexPlanBreakdown summary={plan.summary} />
    </Card>
  );
}
