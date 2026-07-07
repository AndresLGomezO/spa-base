import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Text } from "@repo/ui";

import {
  formatFieldLabel,
  getEntityLabel,
} from "../../../entities/entity-catalog";
import { useEntityCatalog } from "../../../entities/entity-catalog-context";
import type { EntityQueryDraftState } from "../use-entity-query-builder-editor";
import {
  buildEntityQueryPreviewModel,
  formatEntityQueryAdvancedPreview,
} from "./build-entity-query-preview-model.js";
import { EntityQueryPreviewFlow } from "./EntityQueryPreviewFlow.js";
import type {
  EntityQueryPreviewBuildContext,
  EntityQuerySummaryMode,
} from "./entity-query-preview-types.js";

interface EntityQueryDefinitionSummaryContentProps {
  readonly name: string;
  readonly description?: string;
  readonly sourceEntity: string;
  readonly draft: EntityQueryDraftState;
  readonly status: "ACTIVE" | "PAUSED";
  readonly mode?: EntityQuerySummaryMode;
}

export function EntityQueryDefinitionSummaryContent({
  name,
  description,
  sourceEntity,
  draft,
  status,
  mode = "overview",
}: EntityQueryDefinitionSummaryContentProps) {
  const { t } = useTranslation("common");
  const { items: entities } = useEntityCatalog();

  const previewContext = useMemo((): EntityQueryPreviewBuildContext => {
    return {
      entityName: sourceEntity,
      entityLabel: (entityName) => {
        const entry = entities.find((item) => item.name === entityName);
        return entry ? getEntityLabel(entry) : entityName;
      },
      fieldLabel: (entityName, fieldPath) => {
        const entry = entities.find((item) => item.name === entityName);
        return formatFieldLabel(fieldPath, entry);
      },
      t: (key, options) => String(t(key as never, options as never)),
    };
  }, [entities, sourceEntity, t]);

  const previewInput = useMemo(
    () => ({
      name,
      description,
      sourceEntity,
      draft,
      status,
    }),
    [description, draft, name, sourceEntity, status],
  );

  const model = useMemo(
    () => buildEntityQueryPreviewModel(previewInput, previewContext),
    [previewContext, previewInput],
  );

  const advancedPreview = useMemo(
    () => formatEntityQueryAdvancedPreview(previewInput, previewContext),
    [previewContext, previewInput],
  );

  if (mode === "overview" || mode === "details") {
    return <EntityQueryPreviewFlow model={model} mode={mode} />;
  }

  return (
    <div className="space-y-4">
      <Text className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {t("queryBuilder.howItWorks.advanced.title")}
      </Text>
      <pre className="bg-muted max-h-64 overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap">
        {advancedPreview}
      </pre>
    </div>
  );
}

export type { EntityQuerySummaryMode };
