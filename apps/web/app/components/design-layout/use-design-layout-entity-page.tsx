import type { ReactNode } from "react";

import type { EntityName } from "../../entities/entity-catalog";
import { DesignLayoutEntitySubtitle } from "./DesignLayoutEntitySubtitle";
import type { DesignLayoutEntityKind } from "./design-layout-kind";
import { useDesignLayoutEntityNavigation } from "./use-design-layout-entity-navigation";

export function useDesignLayoutEntityPage(
  kind: DesignLayoutEntityKind,
  entityName: EntityName,
  customViewId?: string,
): {
  readonly entitySubtitle: ReactNode;
  readonly isEntityTransitioning: boolean;
} {
  const { navigateToTarget, isEntityTransitioning } =
    useDesignLayoutEntityNavigation(kind, entityName, customViewId);

  const entitySubtitle = (
    <DesignLayoutEntitySubtitle
      kind={kind}
      entityName={entityName}
      customViewId={customViewId}
      onTargetChange={navigateToTarget}
      disabled={isEntityTransitioning}
    />
  );

  return {
    entitySubtitle,
    isEntityTransitioning,
  };
}
