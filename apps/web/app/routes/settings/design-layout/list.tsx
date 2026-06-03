import { Button, toast } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import { useAnyPermission } from "../../../auth/useAnyPermission";
import { DesignLayoutPageHeader } from "../../../components/design-layout/DesignLayoutPageHeader";
import { DesignLayoutRouteGuard } from "../../../components/design-layout/DesignLayoutRouteGuard";
import { EntityListLayoutDesignEditor } from "../../../features/ui-builder/EntityListLayoutDesignEditor";
import { useEntityListLayoutEditor } from "../../../features/ui-builder/use-entity-list-layout-editor.js";
import type { EntityName } from "../../../entities/entity-catalog";
import { useEntityCatalog } from "../../../entities/entity-catalog-context";
import { useRefreshEntityCatalogOnMount } from "../../../entities/use-refresh-entity-catalog-on-mount";
import { EntityPageSkeleton } from "../../../components/loading/EntityPageSkeleton";
import { useEntity } from "../../../hooks/useEntity";
import EntityNotFoundRoute from "../../app/entity-not-found";

export default function DesignLayoutListRoute() {
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
    <DesignLayoutRouteGuard title={t("designLayout.listTitle")}>
      <DesignLayoutListPage entityName={entityName} />
    </DesignLayoutRouteGuard>
  );
}

function DesignLayoutListPage({
  entityName,
}: {
  readonly entityName: EntityName;
}) {
  const { t } = useTranslation("common");
  const canSave = useAnyPermission(ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS);
  const editor = useEntityListLayoutEditor(entityName);
  const { items, isLoading } = useEntity(entityName, { page: 1 });
  const previewItem =
    items.length > 0 ? (items[0] as Record<string, unknown>) : null;

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
        title={t("designLayout.listTitle")}
        description={t("designLayout.listDescription")}
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
        {isLoading && !previewItem ? null : (
          <EntityListLayoutDesignEditor
            entityName={entityName}
            previewItem={previewItem}
            editor={editor}
          />
        )}
      </div>
    </div>
  );
}
