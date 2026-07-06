import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import type { EntityName } from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import {
  decodeDesignLayoutTarget,
  designLayoutTargetPath,
  getCurrentDesignLayoutTargetValue,
} from "./design-layout-target";
import type { DesignLayoutEntityKind } from "./design-layout-kind";

export function useDesignLayoutEntityNavigation(
  kind: DesignLayoutEntityKind,
  entityName: EntityName,
  customViewId?: string,
) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading: isCatalogLoading } = useEntityCatalog();
  const [isEntityTransitioning, setIsEntityTransitioning] = useState(false);
  const [pendingTargetValue, setPendingTargetValue] = useState<string | null>(
    null,
  );

  const currentTargetValue = getCurrentDesignLayoutTargetValue(
    entityName,
    customViewId,
  );

  const navigateToTarget = useCallback(
    (encodedValue: string) => {
      if (encodedValue === currentTargetValue) {
        return;
      }

      const target = decodeDesignLayoutTarget(encodedValue);
      if (!target) {
        return;
      }

      const nextPath = designLayoutTargetPath(kind, target, location.search);
      if (!nextPath) {
        return;
      }

      setPendingTargetValue(encodedValue);
      setIsEntityTransitioning(true);
      navigate(nextPath);
    },
    [currentTargetValue, kind, location.search, navigate],
  );

  useEffect(() => {
    if (!isEntityTransitioning) {
      return;
    }

    if (isCatalogLoading) {
      return;
    }

    if (
      pendingTargetValue !== null &&
      pendingTargetValue !== currentTargetValue
    ) {
      return;
    }

    setIsEntityTransitioning(false);
    setPendingTargetValue(null);
  }, [
    currentTargetValue,
    isCatalogLoading,
    isEntityTransitioning,
    pendingTargetValue,
  ]);

  return {
    navigateToTarget,
    isEntityTransitioning,
  };
}
