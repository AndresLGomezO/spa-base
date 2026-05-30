import { useEffect } from "react";

import { useEntityCatalog } from "./entity-catalog-context";

export function useRefreshEntityCatalogOnMount(): void {
  const { refresh } = useEntityCatalog();

  useEffect(() => {
    void refresh();
  }, [refresh]);
}
