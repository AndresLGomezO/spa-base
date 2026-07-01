import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { CustomViewDesignLayoutRoute } from "../../../components/custom-view/CustomViewDesignLayoutRoute";
import { MetricsRowDesignerView } from "../../../features/metrics-row-designer/MetricsRowDesignerView";

export default function DesignLayoutCustomViewMetricsRoute() {
  const { t } = useTranslation("common");
  const viewId = useParams().viewId ?? "";

  return (
    <CustomViewDesignLayoutRoute
      viewId={viewId}
      title={t("metricsRowDesigner.title")}
    >
      {(entityName, customViewId) => (
        <MetricsRowDesignerView
          entityName={entityName}
          customViewId={customViewId}
        />
      )}
    </CustomViewDesignLayoutRoute>
  );
}
