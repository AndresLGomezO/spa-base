import type { ReactNode } from "react";
import type {
  DesignLayoutSliceData,
  DesignLayoutSurface,
  SerializableEntityDefinition,
} from "@repo/entities";

import type { EntityName } from "../../entities/entity-catalog";
import { DesignLayoutFullOverrideJsonActions } from "./DesignLayoutFullOverrideJsonActions.js";
import { DesignLayoutSliceJsonActions } from "./DesignLayoutSliceJsonActions.js";

export interface DesignLayoutPageActionsProps {
  readonly entityName: EntityName;
  readonly definition: SerializableEntityDefinition;
  readonly surface: DesignLayoutSurface;
  readonly exportSlice: () => DesignLayoutSliceData;
  readonly applySlice: (data: DesignLayoutSliceData) => void;
  readonly canWrite: boolean;
  readonly saveButton: ReactNode;
}

export function DesignLayoutPageActions({
  entityName,
  definition,
  surface,
  exportSlice,
  applySlice,
  canWrite,
  saveButton,
}: DesignLayoutPageActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <DesignLayoutSliceJsonActions
        surface={surface}
        definition={definition}
        exportData={exportSlice()}
        onApply={applySlice}
        canApply={canWrite}
      />
      <span className="bg-border hidden h-6 w-px sm:inline-block" aria-hidden />
      <DesignLayoutFullOverrideJsonActions
        entityName={entityName}
        definition={definition}
        canApply={canWrite}
      />
      {saveButton ? (
        <>
          <span
            className="bg-border hidden h-6 w-px sm:inline-block"
            aria-hidden
          />
          {saveButton}
        </>
      ) : null}
    </div>
  );
}
