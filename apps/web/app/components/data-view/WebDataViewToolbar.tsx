import { useTranslation } from "react-i18next";

import {
  DataViewToolbar,
  type DataViewToolbarLabels,
  type DataViewToolbarProps,
} from "@repo/data-view";

export function WebDataViewToolbar<T>(
  props: Omit<DataViewToolbarProps<T>, "labels">,
) {
  const { t } = useTranslation("common");

  const labels: DataViewToolbarLabels = {
    searchPlaceholder: t("dataView.searchPlaceholder"),
    filtersTrigger: t("dataView.filtersTrigger"),
    filtersClearAll: t("dataView.filtersClearAll"),
    removeBadge: (label) => t("dataView.removeBadge", { label }),
    filterPlaceholder: t("dataView.filterPlaceholder"),
    filterSearchPlaceholder: t("dataView.filterSearchPlaceholder"),
    filterSelectedCount: (count) =>
      t("dataView.filterSelectedCount", { count }),
    noFilterResults: t("dataView.noFilterResults"),
    sortBy: t("dataView.sortBy"),
    sortDefault: t("dataView.sortDefault"),
    sortAscending: t("dataView.sortAscending"),
    sortDescending: t("dataView.sortDescending"),
  };

  return <DataViewToolbar {...props} labels={labels} />;
}
