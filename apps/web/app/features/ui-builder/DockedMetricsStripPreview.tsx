import { useMemo } from "react";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import { Text } from "@repo/ui";
import { metricStripHasContent } from "@repo/entities";
import { useTranslation } from "react-i18next";

import type { SerializableEntityDefinition } from "@repo/entities";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

import { DockedLayoutPreview } from "./DockedLayoutPreview.js";
import { createEntityLayoutRenderContext } from "./create-entity-layout-render-context.js";

interface DockedMetricsStripPreviewProps {
  readonly enabled: boolean;
  readonly stripLayout: UiLayoutDocument;
  readonly entityDefinition: SerializableEntityDefinition;
  readonly locale: string;
}

export function DockedMetricsStripPreview({
  enabled,
  stripLayout,
  entityDefinition,
  locale,
}: DockedMetricsStripPreviewProps) {
  const { t } = useTranslation("common");

  const previewContext = useMemo(
    () =>
      createEntityLayoutRenderContext({
        item: {},
        definition: entityDefinition,
        locale,
        usePreviewPlaceholder: true,
        usePreviewSamples: true,
        listFilters: {},
        routeParams: {},
      }),
    [entityDefinition, locale],
  );

  const hasContent = metricStripHasContent(stripLayout);

  return (
    <DockedLayoutPreview enabled={enabled}>
      <div className="bg-card border-border rounded-lg border p-4">
        <Text className="text-muted-foreground mb-3 text-sm">
          {t("designLayout.metricsPreview")}
        </Text>
        {hasContent ? (
          <RecursiveLayoutRenderer
            layout={stripLayout}
            context={previewContext}
          />
        ) : (
          <Text variant="muted" className="text-sm">
            {t("entity.viewSettings.addSlot")}
          </Text>
        )}
      </div>
    </DockedLayoutPreview>
  );
}
