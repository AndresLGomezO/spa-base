import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { CustomViewDesignLayoutRoute } from "../../../components/custom-view/CustomViewDesignLayoutRoute";
import { ItemListDesignerView } from "../../../features/item-list-designer/ItemListDesignerView";

export default function DesignLayoutCustomViewListRoute() {
  const { t } = useTranslation("common");
  const viewId = useParams().viewId ?? "";

  return (
    <CustomViewDesignLayoutRoute
      viewId={viewId}
      title={t("itemListDesigner.title")}
    >
      {(entityName, customViewId) => (
        <ItemListDesignerView
          entityName={entityName}
          customViewId={customViewId}
        />
      )}
    </CustomViewDesignLayoutRoute>
  );
}
