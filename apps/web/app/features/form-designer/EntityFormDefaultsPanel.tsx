import { listFormDesignOptions, normalizeEntityViews } from "@repo/entities";
import { Button, FieldLabel, Select, Text, toast } from "@repo/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import { useAnyPermission } from "../../auth/useAnyPermission";
import { type EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { putEntityUiOverride } from "../../lib/api-client";
import { patchEntityCatalogAfterUiOverrideSave } from "../ui-builder/patch-entity-catalog-after-ui-override-save";

interface EntityFormDefaultsPanelProps {
  readonly entityName: EntityName;
}

export function EntityFormDefaultsPanel({
  entityName,
}: EntityFormDefaultsPanelProps) {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const definition = useEntityDefinition(entityName);
  const canSave = useAnyPermission(ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS);
  const formDesignOptions = useMemo(
    () => listFormDesignOptions(definition),
    [definition],
  );

  const [createFormDesignId, setCreateFormDesignId] = useState(
    () => definition.ui.entityPageCreateFormDesignId ?? "",
  );
  const [editFormDesignId, setEditFormDesignId] = useState(
    () => definition.ui.entityPageEditFormDesignId ?? "",
  );
  const [isSaving, setIsSaving] = useState(false);

  const saveDefaults = useCallback(async () => {
    setIsSaving(true);
    try {
      const { override } = await putEntityUiOverride(entityName, {
        views: normalizeEntityViews(definition.ui.views),
        ...(definition.ui.listViewType
          ? { listViewType: definition.ui.listViewType }
          : {}),
        ...(definition.ui.formDesigns
          ? { formDesigns: definition.ui.formDesigns }
          : {}),
        ...(createFormDesignId
          ? { entityPageCreateFormDesignId: createFormDesignId }
          : {}),
        ...(editFormDesignId
          ? { entityPageEditFormDesignId: editFormDesignId }
          : {}),
      });
      patchEntityCatalogAfterUiOverrideSave(queryClient, entityName, override);
      toast.success(t("formDesigner.defaults.saved"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("formDesigner.defaults.saveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    createFormDesignId,
    definition,
    editFormDesignId,
    entityName,
    queryClient,
    t,
  ]);

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div>
        <Text className="text-lg font-semibold">
          {t("formDesigner.defaults.title")}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {t("formDesigner.defaults.description")}
        </Text>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <FieldLabel className="text-muted-foreground">
            {t("formDesigner.defaults.createFormDesign")}
          </FieldLabel>
          <Select
            value={createFormDesignId}
            disabled={!canSave}
            onChange={(event) => setCreateFormDesignId(event.target.value)}
          >
            {formDesignOptions.map((option) => (
              <option key={option.id ?? "default"} value={option.id ?? ""}>
                {option.id ? option.label : t("formDesigner.hub.defaultDesign")}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <FieldLabel className="text-muted-foreground">
            {t("formDesigner.defaults.editFormDesign")}
          </FieldLabel>
          <Select
            value={editFormDesignId}
            disabled={!canSave}
            onChange={(event) => setEditFormDesignId(event.target.value)}
          >
            {formDesignOptions.map((option) => (
              <option key={option.id ?? "default"} value={option.id ?? ""}>
                {option.id ? option.label : t("formDesigner.hub.defaultDesign")}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {canSave ? (
        <div>
          <Button loading={isSaving} onClick={() => void saveDefaults()}>
            {t("formDesigner.defaults.save")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
