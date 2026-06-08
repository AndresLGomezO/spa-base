import { Button, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import { useAnyPermission } from "../../../auth/useAnyPermission";
import { DesignLayoutPageHeader } from "../../../components/design-layout/DesignLayoutPageHeader";
import { DesignLayoutRouteGuard } from "../../../components/design-layout/DesignLayoutRouteGuard";
import { EntityFormLayoutDesignEditor } from "../../../features/ui-builder/EntityFormLayoutDesignEditor";
import { useEntityFormLayoutEditor } from "../../../features/ui-builder/use-entity-form-layout-editor";
import type { EntityName } from "../../../entities/entity-catalog";
import { useEntityCatalog } from "../../../entities/entity-catalog-context";
import { useRefreshEntityCatalogOnMount } from "../../../entities/use-refresh-entity-catalog-on-mount";
import { EntityPageSkeleton } from "../../../components/loading/EntityPageSkeleton";
import EntityNotFoundRoute from "../../app/entity-not-found";

export default function DesignLayoutFormsRoute() {
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
    <DesignLayoutRouteGuard title={t("designLayout.formsTitle")}>
      <DesignLayoutFormsPage entityName={entityName} />
    </DesignLayoutRouteGuard>
  );
}

function DesignLayoutFormsPage({
  entityName,
}: {
  readonly entityName: EntityName;
}) {
  const { t } = useTranslation("common");
  const canSave = useAnyPermission(ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS);
  const editor = useEntityFormLayoutEditor(entityName);

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    const saveError = await editor.save();
    if (!saveError) {
      toast.success(t("entity.viewSettings.saved"));
    } else {
      toast.error(saveError);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DesignLayoutPageHeader
        entityName={entityName}
        title={t("designLayout.formsTitle")}
        description={t("designLayout.formsDescription")}
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
      <div className="flex min-h-0 flex-1 flex-col">
        <EntityFormLayoutDesignEditor entityName={entityName} editor={editor} />
      </div>
    </div>
  );
}
