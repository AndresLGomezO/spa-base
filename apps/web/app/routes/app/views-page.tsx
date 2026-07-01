import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { usePermission } from "../../auth/usePermission";
import { CustomViewPage } from "../../components/custom-view/CustomViewPage";
import { Alert, PageLoader } from "@repo/ui";

export default function CustomViewPageRoute() {
  const { t } = useTranslation("common");
  const viewId = useParams().viewId ?? "";
  const canRead = usePermission("customView.read");

  if (!canRead) {
    return <Alert>{t("customViews.forbidden")}</Alert>;
  }

  if (!viewId) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  return <CustomViewPage viewId={viewId} />;
}
