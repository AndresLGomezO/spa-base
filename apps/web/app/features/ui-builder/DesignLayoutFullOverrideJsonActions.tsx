import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  normalizeEntityViews,
  type PutEntityUiOverrideInput,
  type SerializableEntityDefinition,
  type ViewConfig,
} from "@repo/entities";
import { toast } from "@repo/ui";

import type { EntityName } from "../../entities/entity-catalog";
import { putEntityUiOverride } from "../../lib/api-client";
import { designLayoutFullOverrideJsonLabels } from "./design-layout-slice-json-labels.js";
import {
  DesignLayoutFullOverrideJsonImportDialog,
  DesignLayoutFullOverrideJsonViewDialog,
} from "./DesignLayoutFullOverrideJsonDialogs.js";
import { patchEntityCatalogAfterUiOverrideSave } from "./patch-entity-catalog-after-ui-override-save.js";

export interface DesignLayoutFullOverrideJsonActionsProps {
  readonly entityName: EntityName;
  readonly definition: SerializableEntityDefinition;
  readonly canApply: boolean;
}

export function DesignLayoutFullOverrideJsonActions({
  entityName,
  definition,
  canApply,
}: DesignLayoutFullOverrideJsonActionsProps) {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const labels = useMemo(() => designLayoutFullOverrideJsonLabels(t), [t]);

  const handleApply = useCallback(
    async (data: PutEntityUiOverrideInput) => {
      try {
        const { override } = await putEntityUiOverride(entityName, {
          ...data,
          views: normalizeEntityViews(data.views as readonly ViewConfig[]),
        });
        patchEntityCatalogAfterUiOverrideSave(
          queryClient,
          entityName,
          override,
        );
        toast.success(labels.importSaved);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : labels.importFailed,
        );
        throw error;
      }
    },
    [entityName, labels.importFailed, labels.importSaved, queryClient],
  );

  return (
    <>
      <DesignLayoutFullOverrideJsonViewDialog
        definition={definition}
        labels={labels}
      />
      <DesignLayoutFullOverrideJsonImportDialog
        definition={definition}
        canApply={canApply}
        labels={labels}
        onApply={handleApply}
      />
    </>
  );
}

export type { DesignLayoutSliceData, DesignLayoutSurface } from "@repo/entities";
