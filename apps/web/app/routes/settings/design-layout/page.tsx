import { Button, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import { useAnyPermission } from "../../../auth/useAnyPermission";
import { DesignLayoutPageHeader } from "../../../components/design-layout/DesignLayoutPageHeader";
import { DesignLayoutRouteGuard } from "../../../components/design-layout/DesignLayoutRouteGuard";
import { EntityDetailLayoutDesignEditor } from "../../../features/ui-builder/EntityDetailLayoutDesignEditor";
import { useEntityUiOverrideEditor } from "../../../features/ui-builder/use-entity-ui-override-editor";
import type { EntityName } from "../../../entities/entity-catalog";
import { useEntityCatalog } from "../../../entities/entity-catalog-context";
import { useRefreshEntityCatalogOnMount } from "../../../entities/use-refresh-entity-catalog-on-mount";
import { EntityPageSkeleton } from "../../../components/loading/EntityPageSkeleton";
import EntityNotFoundRoute from "../../app/entity-not-found";

export default function DesignLayoutPageRoute() {
  const { t } = useTranslation("common");
  const params = useParams();
  const entityName = (params.entityName ?? "") as EntityName;
  const { isKnownEntity, isLoading } = useEntityCatalog();
  useRefreshEntityCatalogOnMount();

  if (isLoading) {
    return <EntityPageSkeleton />;
  }

  if (!isKnownEntity(entityName)) {
    return <EntityNotFoundRoute />;
  }

  return (
    <DesignLayoutRouteGuard title={t("designLayout.pageTitle")}>
      <DesignLayoutPagePage entityName={entityName} />
    </DesignLayoutRouteGuard>
  );
}

function DesignLayoutPagePage({
  entityName,
}: {
  readonly entityName: EntityName;
}) {
  const { t } = useTranslation("common");
  const canSave = useAnyPermission(ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS);
  const editor = useEntityUiOverrideEditor(entityName, "detail");

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    const ok = await editor.save();
    if (ok) {
      toast.success(t("entity.viewSettings.saved"));
    } else {
      toast.error(t("entity.viewSettings.saveFailed"));
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-4">
      <DesignLayoutPageHeader
        entityName={entityName}
        title={t("designLayout.pageTitle")}
        description={t("designLayout.pageDescription")}
        readOnly={!canSave}
        actions={
          canSave ? (
            <Button
              type="button"
              loading={editor.isSaving}
              onClick={() => void handleSave()}
            >
              {t("entity.viewSettings.save")}
            </Button>
          ) : null
        }
      />
      <EntityDetailLayoutDesignEditor entityName={entityName} editor={editor} />
    </div>
  );
}
