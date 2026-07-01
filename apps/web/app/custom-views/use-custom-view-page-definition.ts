import { useMemo } from "react";

import type { CustomViewRecord } from "@repo/custom-views";
import type { EntityCatalogEntry } from "../entities/entity-catalog";
import { buildCustomViewPageDefinition } from "./custom-view-definition";
import { useCustomViewSourceDefinition } from "./use-custom-view-source-definition";

export function useCustomViewPageDefinition(
  customView: CustomViewRecord | undefined,
): EntityCatalogEntry | null {
  const { definition: sourceDefinition } = useCustomViewSourceDefinition(
    customView?.sourceEntity,
  );

  return useMemo(() => {
    if (!customView || !sourceDefinition) {
      return null;
    }

    return buildCustomViewPageDefinition(sourceDefinition, customView);
  }, [customView, sourceDefinition]);
}
