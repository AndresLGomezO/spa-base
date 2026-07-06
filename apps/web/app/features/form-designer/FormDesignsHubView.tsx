import {
  createDefaultFormLayout,
  normalizeEntityViews,
  resolveFormPresentation,
  type FormDesignDefinition,
} from "@repo/entities";
import { BuilderPageShell, Button, FieldLabel, Input, toast } from "@repo/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import { useAnyPermission } from "../../auth/useAnyPermission";
import type { EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { putEntityUiOverride } from "../../lib/api-client";
import {
  DEFAULT_FORM_DESIGN_ROUTE_ID,
  designLayoutFormDesignPath,
} from "../../routing/design-layout-nav";
import { patchEntityCatalogAfterUiOverrideSave } from "../ui-builder/patch-entity-catalog-after-ui-override-save";
import { EntityFormDefaultsPanel } from "./EntityFormDefaultsPanel";
import { DesignLayoutEntityTransitionShell } from "../../components/design-layout/DesignLayoutEntityTransitionShell";
import { useDesignLayoutEntityPage } from "../../components/design-layout/use-design-layout-entity-page";

function slugifyFormDesignId(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "form-design";
}

function uniqueFormDesignId(
  baseId: string,
  existingIds: ReadonlySet<string>,
): string {
  if (!existingIds.has(baseId)) {
    return baseId;
  }

  let index = 2;
  while (existingIds.has(`${baseId}-${index}`)) {
    index += 1;
  }

  return `${baseId}-${index}`;
}

interface FormDesignsHubViewProps {
  readonly entityName: EntityName;
}

export function FormDesignsHubView({ entityName }: FormDesignsHubViewProps) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const definition = useEntityDefinition(entityName);
  const { entitySubtitle, isEntityTransitioning } = useDesignLayoutEntityPage(
    "forms",
    entityName,
  );
  const canSave = useAnyPermission(ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS);
  const [newDesignLabel, setNewDesignLabel] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const formDesigns = useMemo(
    () => definition.ui.formDesigns ?? [],
    [definition.ui.formDesigns],
  );
  const existingIds = useMemo(
    () => new Set(formDesigns.map((design) => design.id)),
    [formDesigns],
  );

  const createFormDesign = useCallback(async () => {
    const label = newDesignLabel.trim();
    if (!label) {
      return;
    }

    setIsCreating(true);
    try {
      const id = uniqueFormDesignId(slugifyFormDesignId(label), existingIds);
      const fieldPaths = Object.keys(definition.fields).filter(
        (fieldName) => definition.fields[fieldName]?.type !== "document",
      );
      const design: FormDesignDefinition = {
        id,
        label,
        presentation: "plain",
        layout: createDefaultFormLayout(
          fieldPaths.length > 0 ? fieldPaths : ["id"],
        ),
      };

      const { override } = await putEntityUiOverride(entityName, {
        views: normalizeEntityViews(definition.ui.views),
        ...(definition.ui.listViewType
          ? { listViewType: definition.ui.listViewType }
          : {}),
        formDesigns: [...formDesigns, design],
      });

      patchEntityCatalogAfterUiOverrideSave(queryClient, entityName, override);
      setNewDesignLabel("");
      navigate(designLayoutFormDesignPath(entityName, id));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("formDesigner.hub.createFailed"),
      );
    } finally {
      setIsCreating(false);
    }
  }, [
    definition,
    entityName,
    existingIds,
    formDesigns,
    navigate,
    newDesignLabel,
    queryClient,
    t,
  ]);

  const deleteFormDesign = useCallback(
    async (designId: string) => {
      const referencedByCreate =
        definition.ui.entityPageCreateFormDesignId === designId;
      const referencedByEdit =
        definition.ui.entityPageEditFormDesignId === designId;
      if (referencedByCreate || referencedByEdit) {
        toast.error(t("formDesigner.hub.deleteReferenced"));
        return;
      }

      try {
        const { override } = await putEntityUiOverride(entityName, {
          views: normalizeEntityViews(definition.ui.views),
          ...(definition.ui.listViewType
            ? { listViewType: definition.ui.listViewType }
            : {}),
          formDesigns: formDesigns.filter((design) => design.id !== designId),
        });
        patchEntityCatalogAfterUiOverrideSave(
          queryClient,
          entityName,
          override,
        );
        toast.success(t("formDesigner.hub.deleted"));
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t("formDesigner.hub.deleteFailed"),
        );
      }
    },
    [definition, entityName, formDesigns, queryClient, t],
  );

  return (
    <BuilderPageShell
      title={t("formDesigner.hub.title")}
      subtitle={entitySubtitle}
    >
      <DesignLayoutEntityTransitionShell loading={isEntityTransitioning}>
        <div className="flex flex-col gap-8">
          <EntityFormDefaultsPanel entityName={entityName} />

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">
              {t("formDesigner.hub.designsTitle")}
            </h2>

            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">
                      {t("formDesigner.hub.columns.label")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("formDesigner.hub.columns.id")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("formDesigner.hub.columns.presentation")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("formDesigner.hub.columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border">
                    <td className="px-4 py-3">
                      {t("formDesigner.hub.defaultDesign")}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {DEFAULT_FORM_DESIGN_ROUTE_ID}
                    </td>
                    <td className="px-4 py-3">
                      {resolveFormPresentation(definition)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent"
                        to={designLayoutFormDesignPath(
                          entityName,
                          DEFAULT_FORM_DESIGN_ROUTE_ID,
                        )}
                      >
                        {t("formDesigner.hub.edit")}
                      </Link>
                    </td>
                  </tr>
                  {formDesigns.map((design) => (
                    <tr key={design.id} className="border-t border-border">
                      <td className="px-4 py-3">{design.label}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {design.id}
                      </td>
                      <td className="px-4 py-3">
                        {design.presentation ??
                          (design.wizard ? "wizard" : "plain")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent"
                            to={designLayoutFormDesignPath(
                              entityName,
                              design.id,
                            )}
                          >
                            {t("formDesigner.hub.edit")}
                          </Link>
                          {canSave ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void deleteFormDesign(design.id)}
                            >
                              {t("formDesigner.hub.delete")}
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canSave ? (
              <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-end">
                <label className="flex min-w-0 flex-1 flex-col gap-1">
                  <FieldLabel className="text-muted-foreground">
                    {t("formDesigner.hub.newDesignLabel")}
                  </FieldLabel>
                  <Input
                    value={newDesignLabel}
                    onChange={(event) => setNewDesignLabel(event.target.value)}
                    placeholder={t("formDesigner.hub.newDesignPlaceholder")}
                  />
                </label>
                <Button
                  loading={isCreating}
                  disabled={newDesignLabel.trim().length === 0}
                  onClick={() => void createFormDesign()}
                >
                  {t("formDesigner.hub.addDesign")}
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      </DesignLayoutEntityTransitionShell>
    </BuilderPageShell>
  );
}
