import { useTranslation } from "react-i18next";

import { Select, type SelectProps } from "@repo/ui";

export function AdminSelect(props: SelectProps) {
  const { t } = useTranslation("common");

  return (
    <Select
      searchable
      searchPlaceholder={t("formControls.selectSearchPlaceholder")}
      noResultsLabel={t("formControls.selectNoResults")}
      {...props}
    />
  );
}
