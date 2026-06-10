import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type {
  DesignLayoutSliceData,
  DesignLayoutSurface,
  SerializableEntityDefinition,
} from "@repo/entities";

import { designLayoutSliceJsonLabels } from "./design-layout-slice-json-labels.js";
import { DesignLayoutSliceJsonImportDialog } from "./DesignLayoutSliceJsonImportDialog.js";
import { DesignLayoutSliceJsonViewDialog } from "./DesignLayoutSliceJsonViewDialog.js";

interface DesignLayoutSliceJsonActionsProps {
  readonly surface: DesignLayoutSurface;
  readonly definition: SerializableEntityDefinition;
  readonly exportData: DesignLayoutSliceData;
  readonly onApply: (data: DesignLayoutSliceData) => void;
  readonly canApply: boolean;
}

export function DesignLayoutSliceJsonActions({
  surface,
  definition,
  exportData,
  onApply,
  canApply,
}: DesignLayoutSliceJsonActionsProps) {
  const { t } = useTranslation("common");
  const labels = useMemo(
    () => designLayoutSliceJsonLabels(t, surface),
    [surface, t],
  );

  return (
    <>
      <DesignLayoutSliceJsonViewDialog
        surface={surface}
        data={exportData}
        labels={labels}
      />
      <DesignLayoutSliceJsonImportDialog
        surface={surface}
        definition={definition}
        canApply={canApply}
        labels={labels}
        onApply={onApply}
      />
    </>
  );
}
