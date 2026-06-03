import { Text } from "@repo/ui";
import type { UiLayoutDocument } from "@repo/ui-builder-core";
import { useTranslation } from "react-i18next";

import type {
  SerializableEntityDefinition,
  ViewMetricWidget,
} from "@repo/entities";

import { EntityViewMetricsStrip } from "../../components/metrics/EntityViewMetricsStrip.js";
import { DockedLayoutPreview } from "./DockedLayoutPreview.js";

interface DockedMetricsStripPreviewProps {
  readonly enabled: boolean;
  readonly widgets: readonly ViewMetricWidget[];
  readonly stripLayout: UiLayoutDocument;
  readonly entityDefinition: SerializableEntityDefinition;
}

export function DockedMetricsStripPreview({
  enabled,
  widgets,
  stripLayout,
  entityDefinition,
}: DockedMetricsStripPreviewProps) {
  const { t } = useTranslation("common");

  return (
    <DockedLayoutPreview enabled={enabled}>
      <div className="bg-card border-border rounded-lg border p-4">
        <Text className="text-muted-foreground mb-3 text-sm">
          {t("designLayout.metricsPreview")}
        </Text>
        {widgets.length > 0 ? (
          <EntityViewMetricsStrip
            widgets={widgets}
            stripLayout={stripLayout}
            entityDefinition={entityDefinition}
            context={{ listFilters: {}, routeParams: {} }}
            previewMode
          />
        ) : (
          <Text variant="muted" className="text-sm">
            {t("entity.viewSettings.metrics.addKpi")}
          </Text>
        )}
      </div>
    </DockedLayoutPreview>
  );
}
