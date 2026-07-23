import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { formatRecordDisplayLabel } from "../../../components/entity/format-record-display-label";
import {
  getEntityLabel,
  tryGetEntityDefinition,
} from "../../../entities/entity-catalog";
import { useEntityCatalog } from "../../../entities/entity-catalog-context";
import {
  getEntity,
  type EmailMatchBindingRecord,
} from "../../../lib/api-client";
import {
  bindingDisplayName,
  type EmailMatchingDraft,
} from "../email-matching-draft";
import { buildEmailMatchingPreviewModel } from "./build-email-matching-preview-model";
import { EmailMatchingPreviewFlow } from "./EmailMatchingPreviewFlow";
import type {
  EmailMatchingPreviewBuildContext,
  EmailMatchingSummaryMode,
} from "./email-matching-preview-types";

interface EmailMatchingDefinitionSummaryContentProps {
  readonly binding: EmailMatchBindingRecord;
  readonly draft: EmailMatchingDraft;
  readonly mode?: EmailMatchingSummaryMode;
}

export function EmailMatchingDefinitionSummaryContent({
  binding,
  draft,
  mode = "overview",
}: EmailMatchingDefinitionSummaryContentProps) {
  const { t } = useTranslation("common");
  const { items: catalog } = useEntityCatalog();

  const recordQuery = useQuery({
    queryKey: [
      "email-matching-preview-record",
      binding.entityName,
      binding.recordId,
    ] as const,
    queryFn: () =>
      getEntity<Record<string, unknown>>(binding.entityName, binding.recordId),
    staleTime: 60_000,
  });

  const recordName = useMemo(() => {
    const record = recordQuery.data;
    if (!record) {
      return null;
    }
    const definition = tryGetEntityDefinition(binding.entityName, catalog);
    return formatRecordDisplayLabel(record, definition?.displayField);
  }, [binding.entityName, catalog, recordQuery.data]);

  const previewContext = useMemo((): EmailMatchingPreviewBuildContext => {
    return {
      entityLabel: (name) => {
        const definition = tryGetEntityDefinition(name, catalog);
        return definition ? getEntityLabel(definition) : name;
      },
      t: (key, options) => String(t(key as never, options as never)),
    };
  }, [catalog, t]);

  const model = useMemo(
    () =>
      buildEmailMatchingPreviewModel(
        {
          name: draft.name.trim() || bindingDisplayName(binding),
          description: draft.description || undefined,
          entityName: binding.entityName,
          recordId: binding.recordId,
          recordName,
          draft,
        },
        previewContext,
      ),
    [binding, draft, previewContext, recordName],
  );

  return <EmailMatchingPreviewFlow model={model} mode={mode} />;
}
