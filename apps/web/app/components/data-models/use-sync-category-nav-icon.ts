import { useEffect } from "react";

import type { EntityCategoryRecord } from "../../lib/api-client";

export function useSyncCategoryNavIcon(
  navCategoryId: string,
  useCategoryIcon: boolean,
  navCategories: readonly EntityCategoryRecord[],
  setNavIcon: (icon: string) => void,
): void {
  useEffect(() => {
    if (!useCategoryIcon || !navCategoryId.trim()) {
      return;
    }

    const category = navCategories.find((item) => item.id === navCategoryId);
    if (category) {
      setNavIcon(category.icon);
    }
  }, [navCategoryId, navCategories, setNavIcon, useCategoryIcon]);
}
