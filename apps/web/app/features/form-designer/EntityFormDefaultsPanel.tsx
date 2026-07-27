import {
  listFormDesignOptions,
  normalizeEntityViews,
  summarizeEntityPageFormDesignSlot,
} from "@repo/entities";
import { Button, FieldLabel, Text, toast } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import { useAnyPermission } from "../../auth/useAnyPermission";
import { type EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { putEntityUiOverride } from "../../lib/api-client";
import { entityCatalogQueryKey } from "../../query/query-client";
import { designLayoutFormDesignPath } from "../../routing/design-layout-nav";
import { patchEntityCatalogAfterUiOverrideSave } from "../ui-builder/patch-entity-catalog-after-ui-override-save";

interface EntityFormDefaultsPanelProps {
  readonly entityName: EntityName;
}

function presentationLabelKey(
  presentation: "plain" | "wizard",
):
  | "formDesigner.defaults.presentationPlain"
  | "formDesigner.defaults.presentationWizard" {
  return presentation === "wizard"
    ? "formDesigner.defaults.presentationWizard"
    : "formDesigner.defaults.presentationPlain";
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

  useEffect(() => {
    setCreateFormDesignId(definition.ui.entityPageCreateFormDesignId ?? "");
    setEditFormDesignId(definition.ui.entityPageEditFormDesignId ?? "");
  }, [
    definition.ui.entityPageCreateFormDesignId,
    definition.ui.entityPageEditFormDesignId,
  ]);

  const createOptions = useMemo(
    () =>
      ensureOrphanOption(
        formDesignOptions,
        createFormDesignId,
        t("formDesigner.defaults.missingOption", { id: createFormDesignId }),
      ),
    [createFormDesignId, formDesignOptions, t],
  );
  const editOptions = useMemo(
    () =>
      ensureOrphanOption(
        formDesignOptions,
        editFormDesignId,
        t("formDesigner.defaults.missingOption", { id: editFormDesignId }),
      ),
    [editFormDesignId, formDesignOptions, t],
  );

  const createSummary = useMemo(
    () =>
      summarizeEntityPageFormDesignSlot(
        definition,
        createFormDesignId || undefined,
      ),
    [createFormDesignId, definition],
  );
  const editSummary = useMemo(
    () =>
      summarizeEntityPageFormDesignSlot(
        definition,
        editFormDesignId || undefined,
      ),
    [definition, editFormDesignId],
  );

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
        entityPageCreateFormDesignId: createFormDesignId
          ? createFormDesignId
          : null,
        entityPageEditFormDesignId: editFormDesignId ? editFormDesignId : null,
      });
      patchEntityCatalogAfterUiOverrideSave(queryClient, entityName, override);
      await queryClient.invalidateQueries({ queryKey: entityCatalogQueryKey });
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
        <FormDefaultSlot
          label={t("formDesigner.defaults.createFormDesign")}
          value={createFormDesignId}
          disabled={!canSave}
          options={createOptions}
          defaultOptionLabel={t("formDesigner.hub.defaultDesign")}
          summaryLabel={
            createSummary.isDefault
              ? t("formDesigner.defaults.usingDefault")
              : createSummary.missing
                ? t("formDesigner.defaults.missingDesign", {
                    id: createSummary.formDesignId,
                  })
                : t("formDesigner.defaults.summary", {
                    name: createSummary.label,
                    presentation: t(
                      presentationLabelKey(createSummary.presentation),
                    ),
                  })
          }
          summaryTone={createSummary.missing ? "warning" : "muted"}
          openDesignLabel={t("formDesigner.defaults.openDesign")}
          openDesignTo={
            createSummary.formDesignId && !createSummary.missing
              ? designLayoutFormDesignPath(
                  entityName,
                  createSummary.formDesignId,
                )
              : undefined
          }
          onChange={setCreateFormDesignId}
        />

        <FormDefaultSlot
          label={t("formDesigner.defaults.editFormDesign")}
          value={editFormDesignId}
          disabled={!canSave}
          options={editOptions}
          defaultOptionLabel={t("formDesigner.hub.defaultDesign")}
          summaryLabel={
            editSummary.isDefault
              ? t("formDesigner.defaults.usingDefault")
              : editSummary.missing
                ? t("formDesigner.defaults.missingDesign", {
                    id: editSummary.formDesignId,
                  })
                : t("formDesigner.defaults.summary", {
                    name: editSummary.label,
                    presentation: t(
                      presentationLabelKey(editSummary.presentation),
                    ),
                  })
          }
          summaryTone={editSummary.missing ? "warning" : "muted"}
          openDesignLabel={t("formDesigner.defaults.openDesign")}
          openDesignTo={
            editSummary.formDesignId && !editSummary.missing
              ? designLayoutFormDesignPath(entityName, editSummary.formDesignId)
              : undefined
          }
          onChange={setEditFormDesignId}
        />
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

function FormDefaultSlot({
  label,
  value,
  disabled,
  options,
  defaultOptionLabel,
  summaryLabel,
  summaryTone,
  openDesignLabel,
  openDesignTo,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly disabled: boolean;
  readonly options: ReturnType<typeof listFormDesignOptions>;
  readonly defaultOptionLabel: string;
  readonly summaryLabel: string;
  readonly summaryTone: "muted" | "warning";
  readonly openDesignLabel: string;
  readonly openDesignTo?: string;
  readonly onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <label className="flex flex-col gap-1">
        <FieldLabel className="text-muted-foreground">{label}</FieldLabel>
        <Select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.id ?? "default"} value={option.id ?? ""}>
              {option.id ? option.label : defaultOptionLabel}
            </option>
          ))}
        </Select>
      </label>
      <Text
        className={
          summaryTone === "warning"
            ? "text-amber-700 dark:text-amber-400 text-xs"
            : "text-muted-foreground text-xs"
        }
      >
        {summaryLabel}
      </Text>
      {openDesignTo ? (
        <Link
          className="text-primary text-xs font-medium underline-offset-2 hover:underline"
          to={openDesignTo}
        >
          {openDesignLabel}
        </Link>
      ) : null}
    </div>
  );
}

function ensureOrphanOption(
  options: ReturnType<typeof listFormDesignOptions>,
  selectedId: string,
  missingLabel: string,
): ReturnType<typeof listFormDesignOptions> {
  if (!selectedId) {
    return options;
  }
  if (options.some((option) => option.id === selectedId)) {
    return options;
  }
  return [...options, { id: selectedId, label: missingLabel }];
}
