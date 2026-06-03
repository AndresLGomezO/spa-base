import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";

import type { SerializableEntityDefinition } from "@repo/entities";
import { useTranslation } from "react-i18next";

import { createEntityRecordRenderContext } from "../../features/ui-builder/create-entity-record-render-context";
import { useFieldAccess } from "../../hooks/useFieldAccess";
import { useEntityCatalog } from "../../entities/entity-catalog-context";

interface EntityLayoutDetailViewProps {
  readonly record: Record<string, unknown>;
  readonly definition: SerializableEntityDefinition;
}

export function EntityLayoutDetailView({
  record,
  definition,
}: EntityLayoutDetailViewProps) {
  const { i18n } = useTranslation("common");
  const fieldAccess = useFieldAccess(
    definition.name as import("../../entities/entity-catalog").EntityName,
  );
  const { items: catalogItems } = useEntityCatalog();
  const layout = definition.ui.recordDetailLayout ?? definition.ui.detailLayout;

  if (!layout) {
    return null;
  }

  return (
    <RecursiveLayoutRenderer
      layout={layout}
      context={createEntityRecordRenderContext({
        item: record,
        definition,
        locale: i18n.language,
        fieldAccess,
        getDefinition: (name) =>
          catalogItems.find((entry) => entry.name === name),
      })}
    />
  );
}
