import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { CustomViewDesignLayoutRoute } from "../../../components/custom-view/CustomViewDesignLayoutRoute";
import { MainViewDesignerView } from "../../../features/main-view-designer/MainViewDesignerView";

export default function DesignLayoutCustomViewMainRoute() {
  const { t } = useTranslation("common");
  const viewId = useParams().viewId ?? "";

  return (
    <CustomViewDesignLayoutRoute
      viewId={viewId}
      title={t("mainViewDesigner.title")}
    >
      {(entityName, customViewId) => (
        <MainViewDesignerView
          entityName={entityName}
          customViewId={customViewId}
        />
      )}
    </CustomViewDesignLayoutRoute>
  );
}
