import type { ViewSearchComponentConfig } from "@repo/ui-builder-core";
import { SearchField } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useOptionalViewFilterPageState } from "./view-filter-page-context";

interface ViewSearchComponentProps {
  readonly config: ViewSearchComponentConfig;
}

export function ViewSearchComponent({ config }: ViewSearchComponentProps) {
  const { t } = useTranslation("common");
  const pageState = useOptionalViewFilterPageState();

  if (!pageState) {
    return null;
  }

  return (
    <SearchField
      value={pageState.search}
      onChange={pageState.setSearch}
      placeholder={
        config.placeholder?.trim() || t("dataView.searchPlaceholder")
      }
      ariaLabel={config.placeholder?.trim() || t("dataView.searchPlaceholder")}
    />
  );
}
