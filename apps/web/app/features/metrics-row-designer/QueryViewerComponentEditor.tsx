import type {
  QueryViewerComponentConfig,
  UiComponentConfig,
} from "@repo/ui-builder-core";
import { FieldLabel, Text, Select } from "@repo/ui";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  getEntityLabel,
  tryGetEntityDefinition,
} from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import {
  listEntityQueryDefinitions,
  type EntityQueryDefinitionRecord,
} from "../../lib/api-client";

interface QueryViewerComponentEditorProps {
  readonly config: QueryViewerComponentConfig;
  readonly onChange: (config: UiComponentConfig) => void;
}

function resolveQueryLabel(
  query: EntityQueryDefinitionRecord,
  getEntityLabelFn: (name: string) => string,
): string {
  const entityLabel = getEntityLabelFn(query.sourceEntity);
  return `${entityLabel} · ${query.name}`;
}

export function QueryViewerComponentEditor({
  config,
  onChange,
}: QueryViewerComponentEditorProps) {
  const { t } = useTranslation("common");
  const { items, getDefinition } = useEntityCatalog();
  const [definitions, setDefinitions] = useState<
    readonly EntityQueryDefinitionRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDefinitions() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const result = await listEntityQueryDefinitions();
        if (!cancelled) {
          setDefinitions(result.items);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : t("error.generic"),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDefinitions();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const configuredQueryId = config.entityQueryDefinitionId.trim();

  const queryOptions = useMemo(() => {
    const options = definitions.map((query) => ({
      value: query.id,
      label: resolveQueryLabel(query, (entityName) =>
        getEntityLabel(getDefinition(entityName)),
      ),
    }));

    if (
      configuredQueryId.length > 0 &&
      !options.some((option) => option.value === configuredQueryId)
    ) {
      const staleDefinition = definitions.find(
        (item) => item.id === configuredQueryId,
      );
      options.unshift({
        value: configuredQueryId,
        label: staleDefinition
          ? resolveQueryLabel(staleDefinition, (entityName) =>
              getEntityLabel(getDefinition(entityName)),
            )
          : configuredQueryId,
      });
    }

    return options;
  }, [configuredQueryId, definitions, getDefinition]);

  const selectedQuery = definitions.find(
    (item) => item.id === configuredQueryId,
  );
  const sourceEntityDefinition = selectedQuery
    ? tryGetEntityDefinition(selectedQuery.sourceEntity, items)
    : undefined;

  if (isLoading) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("metricsRowDesigner.queryViewerEditor.loading")}
      </Text>
    );
  }

  if (loadError) {
    return <Text className="text-destructive text-sm">{loadError}</Text>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <FieldLabel>
          {t("metricsRowDesigner.queryViewerEditor.query")}
        </FieldLabel>
        {definitions.length === 0 ? (
          <Text className="text-muted-foreground text-sm">
            {t("metricsRowDesigner.queryViewerEditor.noQueries")}
          </Text>
        ) : (
          <Select
            value={configuredQueryId}
            onChange={(event) =>
              onChange({
                ...config,
                entityQueryDefinitionId: event.target.value,
              })
            }
          >
            <option value="" disabled>
              {t("metricsRowDesigner.queryViewerEditor.selectQuery")}
            </option>
            {queryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
      </div>

      {selectedQuery && sourceEntityDefinition ? (
        <Text className="text-muted-foreground text-xs">
          {t("metricsRowDesigner.queryViewerEditor.sourceEntity", {
            entity: getEntityLabel(sourceEntityDefinition),
          })}
        </Text>
      ) : null}
    </div>
  );
}
