import { useTranslation } from "react-i18next";

import type { PaginationLabels } from "@repo/ui";

export function useTablePaginationLabels(): PaginationLabels {
  const { t } = useTranslation("common");

  return {
    firstPage: t("table.paginationFirst"),
    previousPage: t("table.paginationPrevious"),
    nextPage: t("table.paginationNext"),
    lastPage: t("table.paginationLast"),
    page: (pageNumber) => t("table.paginationPage", { page: pageNumber }),
  };
}
