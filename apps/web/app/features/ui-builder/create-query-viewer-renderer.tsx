import { useEffect, useMemo, useState } from "react";
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
import {
  getEntityQueryDefinition,
  type EntityQueryDefinitionRecord,
} from "../../lib/api-client";
import { executeEntityQueryDefinition } from "./execute-entity-query-definition";
import { useOneToManyRelationSubfieldValues } from "../../hooks/useOneToManyRelationSubfieldValues";

interface CreateQueryViewerRendererOptions {
  readonly catalogItems: readonly EntityCatalogEntry[];
  readonly t: TFunction;
  readonly buildLayoutContext: (
    definition: SerializableEntityDefinition,
    item: Record<string, unknown>,
    extras?: {
      readonly getOneToManyRelationSubfieldValue?: (
        recordId: string,
        fieldPath: string,
      ) => unknown;
    },
  ) => LayoutRenderContext;
}

function rowsToItemLayout(rows: readonly RowNode[]): UiLayoutDocument {
  return {
    root: {
      type: "root",
      id: "query-viewer-item-root",
      columnCount: 1,
      columns: [
        {
          id: "query-viewer-item-col",
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
  buildLayoutContext,
}: {
  readonly config: QueryViewerComponentConfig;
  readonly catalogItems: readonly EntityCatalogEntry[];
  readonly t: TFunction;
  readonly buildLayoutContext: CreateQueryViewerRendererOptions["buildLayoutContext"];
}) {
  const queryId = config.entityQueryDefinitionId.trim();
  const [definition, setDefinition] =
    useState<EntityQueryDefinitionRecord | null>(null);
  const [items, setItems] = useState<readonly Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemLayout = useMemo(
    () => rowsToItemLayout(config.rows),
    [config.rows],
  );

  const stackDirection = config.stackDirection ?? "column";
  const innerStyles = filterComponentInnerStyleRules(config.styles);
  const { containerClassName } = splitStyleRuleClasses(innerStyles);
  const containerStyle = layoutInlineStyleFromStyleRules(innerStyles);
  const shellClassName = resolveMetricWidgetShellClassName(config.styles);
  const stackClassName = stackShellLayoutClasses(innerStyles, stackDirection);
  const stackFlex = parseFlexLayoutFromStyles(innerStyles);
  const stackGapProps = gapLayoutProps(innerStyles);

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

  const { getSubfieldValue } = useOneToManyRelationSubfieldValues(
    resolvedSourceDefinition ?? EMPTY_SOURCE_DEFINITION,
    parentItems,
    getDefinitionForRelations,
  );

  useEffect(() => {
    if (queryId.length === 0) {
      setDefinition(null);
      setItems([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadQueryResults() {
      setIsLoading(true);
      setError(null);

      try {
        const loadedDefinition = await getEntityQueryDefinition(queryId);
        if (cancelled) {
          return;
        }

        setDefinition(loadedDefinition);

        const results = await executeEntityQueryDefinition(
          loadedDefinition,
          catalogItems,
        );
        if (!cancelled) {
          setItems(results);
        }
      } catch (loadError) {
        if (!cancelled) {
          setDefinition(null);
          setItems([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : t("metricsRowDesigner.queryViewerEditor.loadFailed"),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadQueryResults();

    return () => {
      cancelled = true;
    };
  }, [catalogItems, queryId, t]);

  if (queryId.length === 0) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("metricsRowDesigner.queryViewerEditor.unconfigured")}
      </Text>
    );
  }

  if (isLoading) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("metricsRowDesigner.queryViewerEditor.loading")}
      </Text>
    );
  }

  if (error) {
    return <Text className="text-destructive text-sm">{error}</Text>;
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
            getOneToManyRelationSubfieldValue: getSubfieldValue,
          })}
        />
      ))}
    </LayoutStack>
  );
}

export function createQueryViewerRenderer(
  options: CreateQueryViewerRendererOptions,
) {
  const { catalogItems, t, buildLayoutContext } = options;

  return (config: QueryViewerComponentConfig) => (
    <QueryViewerRuntime
      config={config}
      catalogItems={catalogItems}
      t={t}
      buildLayoutContext={buildLayoutContext}
    />
  );
}
