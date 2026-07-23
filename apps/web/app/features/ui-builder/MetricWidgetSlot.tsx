import { useTranslation } from "react-i18next";
import {
  filterComponentInnerStyleRules,
  layoutInlineStyleFromStyleRules,
  resolveMetricWidgetShellClassName,
  splitStyleRuleClasses,
  type MetricWidgetComponentConfig,
} from "@repo/ui-builder-core";
import { EmbeddedLayoutRenderer } from "@repo/ui-builder-renderer";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";
import type { SerializableEntityDefinition } from "@repo/entities";

import { WidgetLoadingIndicator } from "../../components/loading/WidgetLoadingIndicator.js";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import {
  normalizeMetricWidgetString,
  resolveMetricWidgetTarget,
} from "./resolve-metric-widget-reference";

export type MetricWidgetBuildLayoutContext = (
  definition: SerializableEntityDefinition,
  item: Record<string, unknown>,
  extras?: {
    readonly getOneToManyRelationSubfieldValue?: (
      recordId: string,
      fieldPath: string,
    ) => unknown;
    readonly getManyToOneRelationSubfieldValue?: (
      recordId: string,
      fieldPath: string,
    ) => unknown;
  },
) => LayoutRenderContext;

interface MetricWidgetSlotProps {
  readonly config: MetricWidgetComponentConfig;
  readonly buildLayoutContext: MetricWidgetBuildLayoutContext;
}

export function MetricWidgetSlot({
  config,
  buildLayoutContext,
}: MetricWidgetSlotProps) {
  const { t } = useTranslation("common");
  const { items, isLoading } = useEntityCatalog();

  const widgetId = normalizeMetricWidgetString(config.widgetId);
  if (widgetId.length === 0) {
    return null;
  }

  const resolved = resolveMetricWidgetTarget(items, config);
  if (!resolved) {
    if (isLoading) {
      return (
        <WidgetLoadingIndicator
          ariaLabel={t("metrics.widget.loading")}
          size="sm"
        />
      );
    }
    return null;
  }

  const { widget, entityDefinition } = resolved;
  const innerStyles = filterComponentInnerStyleRules(config.styles);
  const { containerClassName } = splitStyleRuleClasses(innerStyles);
  const containerStyle = layoutInlineStyleFromStyleRules(innerStyles);
  const shellClassName = resolveMetricWidgetShellClassName(config.styles);

  return (
    <EmbeddedLayoutRenderer
      layout={widget.layout}
      context={buildLayoutContext(entityDefinition, {})}
      shellClassName={[shellClassName, containerClassName]
        .filter(Boolean)
        .join(" ")}
      shellStyle={containerStyle}
      inheritDesignerWrappers={false}
    />
  );
}
