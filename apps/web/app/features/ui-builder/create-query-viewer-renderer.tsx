import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutStack, Text } from "@repo/ui";
import {
  filterComponentInnerStyleRules,
  flexWrapClassFromStyles,
  gapPxFromStyles,
  gapStyleFromStyleRules,
  isCssLengthTokenValue,
  layoutInlineStyleFromStyleRules,
  parseFlexLayoutFromStyles,
  resolveMetricWidgetShellClassName,
  splitStyleRuleClasses,
  stackShellLayoutClasses,
  type QueryViewerComponentConfig,
  type RowNode,
  type StyleRule,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { EmbeddedLayoutRenderer } from "@repo/ui-builder-renderer";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";
import type { SerializableEntityDefinition } from "@repo/entities";
import type { TFunction } from "i18next";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { tryGetEntityDefinition } from "../../entities/entity-catalog";
import { useManyToOneRelationSubfieldValues } from "../../hooks/useManyToOneRelationSubfieldValues";
import { useOneToManyRelationSubfieldValues } from "../../hooks/useOneToManyRelationSubfieldValues";
import type { PageFilterContext } from "../../lib/metric-binding-resolution";
import { entityQueryResultsQueryKey } from "../../query/query-client";
import { loadQueryViewerResults } from "./load-query-viewer-results";

interface CreateQueryViewerRendererOptions {
  readonly catalogItems: readonly EntityCatalogEntry[];
  readonly t: TFunction;
  readonly pageFilterContext: PageFilterContext;
  readonly buildLayoutContext: (
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
}

function rowsToLayout(
  rows: readonly RowNode[],
  rootId: string,
): UiLayoutDocument {
  return {
    root: {
      type: "root",
      id: rootId,
      columnCount: 1,
      columns: [
        {
          id: `${rootId}-col`,
          rows: [...rows],
        },
      ],
    },
  };
}

function gapLayoutProps(styles: readonly StyleRule[] | undefined): {
  readonly gap: number;
  readonly style?: { readonly gap: string };
} {
  const gapCss = gapStyleFromStyleRules(styles);
  if (gapCss && isCssLengthTokenValue(gapCss)) {
    return { gap: 0, style: { gap: gapCss } };
  }

  return { gap: gapPxFromStyles(styles) };
}

function buildQueryViewerContextKey(
  config: QueryViewerComponentConfig,
  pageFilterContext: PageFilterContext,
): string {
  return JSON.stringify({
    parameterBindings: config.parameterBindings ?? {},
    dashboardDateFilter: pageFilterContext.dashboardDateFilter ?? null,
    listFilters: pageFilterContext.listFilters ?? {},
    routeParams: pageFilterContext.routeParams ?? {},
  });
}

const EMPTY_SOURCE_DEFINITION: SerializableEntityDefinition = {
  name: "query-viewer-source",
  collection: "query-viewer-source",
  permissions: [],
  fields: {},
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
    fields: {},
  },
};

function QueryViewerRuntime({
  config,
  catalogItems,
  t,
  pageFilterContext,
  buildLayoutContext,
}: {
  readonly config: QueryViewerComponentConfig;
  readonly catalogItems: readonly EntityCatalogEntry[];
  readonly t: TFunction;
  readonly pageFilterContext: PageFilterContext;
  readonly buildLayoutContext: CreateQueryViewerRendererOptions["buildLayoutContext"];
}) {
  const queryId = config.entityQueryDefinitionId.trim();
  const contextKey = useMemo(
    () => buildQueryViewerContextKey(config, pageFilterContext),
    [config, pageFilterContext],
  );

  const itemLayout = useMemo(
    () => rowsToLayout(config.rows, "query-viewer-item-root"),
    [config.rows],
  );

  const emptyStateLayout = useMemo(
    () =>
      config.emptyStateRows && config.emptyStateRows.length > 0
        ? rowsToLayout(config.emptyStateRows, "query-viewer-empty-root")
        : null,
    [config.emptyStateRows],
  );

  const stackDirection = config.stackDirection ?? "column";
  const innerStyles = filterComponentInnerStyleRules(config.styles);
  const { containerClassName } = splitStyleRuleClasses(innerStyles);
  const containerStyle = layoutInlineStyleFromStyleRules(innerStyles);
  const shellClassName = resolveMetricWidgetShellClassName(config.styles);
  const stackClassName = stackShellLayoutClasses(innerStyles, stackDirection);
  const stackFlex = parseFlexLayoutFromStyles(innerStyles);
  const stackGapProps = gapLayoutProps(innerStyles);

  const queryResults = useQuery({
    queryKey: entityQueryResultsQueryKey(queryId, contextKey),
    queryFn: () =>
      loadQueryViewerResults(queryId, catalogItems, {
        parameterBindings: config.parameterBindings,
        context: pageFilterContext,
      }),
    enabled: queryId.length > 0,
  });

  const definition = queryResults.data?.definition ?? null;
  const items = useMemo(
    () => queryResults.data?.items ?? [],
    [queryResults.data?.items],
  );

  const resolvedSourceDefinition = definition
    ? tryGetEntityDefinition(definition.sourceEntity, catalogItems)
    : undefined;

  const getDefinitionForRelations = (entityName: string) =>
    tryGetEntityDefinition(entityName, catalogItems)!;

  const parentItems = useMemo(
    () =>
      items.map((item) => ({
        id: String(item.id ?? ""),
      })),
    [items],
  );

  const { getSubfieldValue: getOneToManySubfieldValue } =
    useOneToManyRelationSubfieldValues(
      resolvedSourceDefinition ?? EMPTY_SOURCE_DEFINITION,
      parentItems,
      getDefinitionForRelations,
    );

  const { getSubfieldValue: getManyToOneSubfieldValue } =
    useManyToOneRelationSubfieldValues(
      resolvedSourceDefinition ?? EMPTY_SOURCE_DEFINITION,
      items,
      getDefinitionForRelations,
    );

  if (queryId.length === 0) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("metricsRowDesigner.queryViewerEditor.unconfigured")}
      </Text>
    );
  }

  if (queryResults.isLoading) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("metricsRowDesigner.queryViewerEditor.loading")}
      </Text>
    );
  }

  if (queryResults.isError) {
    const message =
      queryResults.error instanceof Error
        ? queryResults.error.message
        : t("metricsRowDesigner.queryViewerEditor.loadFailed");
    return <Text className="text-destructive text-sm">{message}</Text>;
  }

  const sourceDefinition = definition
    ? tryGetEntityDefinition(definition.sourceEntity, catalogItems)
    : undefined;

  if (!sourceDefinition) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("metricsRowDesigner.queryViewerEditor.missingSourceEntity")}
      </Text>
    );
  }

  if (items.length === 0) {
    if (emptyStateLayout) {
      return (
        <EmbeddedLayoutRenderer
          layout={emptyStateLayout}
          context={buildLayoutContext(sourceDefinition, {})}
        />
      );
    }

    return (
      <Text className="text-muted-foreground text-sm">
        {t("metricsRowDesigner.queryViewerEditor.emptyResults")}
      </Text>
    );
  }

  return (
    <LayoutStack
      direction={stackDirection}
      gap={stackGapProps.gap}
      align={stackFlex.align}
      justify={stackFlex.justify}
      className={[
        stackClassName,
        shellClassName,
        containerClassName,
        stackDirection === "column" ? "flex-col" : "flex-row",
        stackDirection === "row" &&
          stackFlex.align === undefined &&
          "items-stretch",
        flexWrapClassFromStyles(innerStyles),
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ...stackGapProps.style, ...containerStyle }}
    >
      {items.map((item, index) => (
        <EmbeddedLayoutRenderer
          key={String(item.id ?? `query-item-${index}`)}
          layout={itemLayout}
          context={buildLayoutContext(sourceDefinition, item, {
            getOneToManyRelationSubfieldValue: getOneToManySubfieldValue,
            getManyToOneRelationSubfieldValue: getManyToOneSubfieldValue,
          })}
        />
      ))}
    </LayoutStack>
  );
}

export function createQueryViewerRenderer(
  options: CreateQueryViewerRendererOptions,
) {
  const { catalogItems, t, pageFilterContext, buildLayoutContext } = options;

  return (config: QueryViewerComponentConfig) => (
    <QueryViewerRuntime
      config={config}
      catalogItems={catalogItems}
      t={t}
      pageFilterContext={pageFilterContext}
      buildLayoutContext={buildLayoutContext}
    />
  );
}
