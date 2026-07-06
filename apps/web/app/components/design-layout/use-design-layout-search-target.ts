import { useMemo } from "react";
import { useSearchParams } from "react-router";

import type { EntityName } from "../../entities/entity-catalog";
import { readDesignLayoutSearchTarget } from "./design-layout-search-params";

interface DesignLayoutSearchTarget {
  readonly entityName: EntityName | null;
  readonly customViewId: string | null;
  readonly hasTarget: boolean;
}

export function useDesignLayoutSearchTarget(): DesignLayoutSearchTarget {
  const [searchParams] = useSearchParams();

  return useMemo(
    () => readDesignLayoutSearchTarget(searchParams.toString()),
    [searchParams],
  );
}
