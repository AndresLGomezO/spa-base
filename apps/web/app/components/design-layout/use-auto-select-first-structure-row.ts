import { useEffect } from "react";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

import type { ComponentRowRef } from "../../features/form-designer/form-designer-component-row-ref";
import { resolveFirstComponentRowRef } from "./resolve-first-structure-selection";

export function useAutoSelectFirstStructureRowOnEntityChange(
  entityName: string,
  layout: UiLayoutDocument,
  setSelectedRow: (row: ComponentRowRef | null) => void,
) {
  useEffect(() => {
    setSelectedRow(resolveFirstComponentRowRef(layout));
    // Only reset selection when the entity changes, not on every layout edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- layout is read once per entity switch
  }, [entityName, setSelectedRow]);
}
