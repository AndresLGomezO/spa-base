import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Card, Text } from "@repo/ui";

import type { EntityDefinitionRecord } from "../../lib/api-client";

import { planIndexesFromDefinitionRecords } from "./plan-entity-indexes";

interface TenantIndexPlanKpiCardProps {
  readonly items: readonly EntityDefinitionRecord[];
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

export function TenantIndexPlanKpiCard({ items }: TenantIndexPlanKpiCardProps) {
  const { t } = useTranslation("common");

  const tenantPlan = useMemo(
    () => planIndexesFromDefinitionRecords(items),
    [items],
  );

  if (items.length === 0) {
    return null;
  }

  const { summary } = tenantPlan;

  return (
    <Card className="space-y-3 p-4">
      <div>
        <Text className="font-medium">
          {t("dataModels.indexPlan.tenantTitle")}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {t("dataModels.indexPlan.tenantDescription", {
            count: items.length,
          })}
        </Text>
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        <Text className="text-2xl font-semibold tabular-nums">
          {tenantPlan.total}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {t("dataModels.indexPlan.totalLabel")}
        </Text>
      </div>
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
      <Text className="text-muted-foreground text-xs">
        {t("dataModels.indexPlan.projectScopeFootnote")}
      </Text>
    </Card>
  );
}
