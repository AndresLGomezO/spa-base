import { useMemo } from "react";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import { metricStripHasContent } from "@repo/entities";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

import type { SerializableEntityDefinition } from "@repo/entities";

import type { MetricBindingContext } from "../../lib/metric-binding-resolution.js";
import { createEntityLayoutRenderContext } from "../../features/ui-builder/create-entity-layout-render-context.js";

interface EntityViewMetricsStripProps {
  readonly stripLayout: UiLayoutDocument;
  readonly entityDefinition: SerializableEntityDefinition;
  readonly context?: MetricBindingContext;
  readonly locale?: string;
  readonly previewMode?: boolean;
}

export function EntityViewMetricsStrip({
  stripLayout,
  entityDefinition,
  context = {},
  locale = "en",
  previewMode = false,
}: EntityViewMetricsStripProps) {
  const renderContext = useMemo(
    () =>
      createEntityLayoutRenderContext({
        item: context.record ?? {},
        definition: entityDefinition,
        locale,
        listFilters: context.listFilters,
        routeParams: context.routeParams,
        usePreviewPlaceholder: previewMode,
        usePreviewSamples: previewMode,
      }),
    [
      context.listFilters,
      context.record,
      context.routeParams,
      entityDefinition,
      locale,
      previewMode,
    ],
  );

  if (!metricStripHasContent(stripLayout)) {
    return null;
  }

  return (
    <RecursiveLayoutRenderer layout={stripLayout} context={renderContext} />
  );
}
