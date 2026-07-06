import { useMemo } from "react";
import {
  Button,
  FieldLabel,
  Input,
  Select,
  Text,
  Textarea,
  toast,
} from "@repo/ui";
import { ExternalLink, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { optionalCustomViewUIConfig } from "../../custom-views/normalize-custom-view-ui";
import { useEntityNavCategories } from "../../hooks/useEntityNavCategories";
import { listEntityQueryDefinitions } from "../../lib/api-client";
import { designLayoutCustomViewPath } from "../../routing/design-layout-nav";
import {
  designerPreviewPanelBodyFillClassName,
  designerPreviewPanelHeaderClassName,
  designerPreviewPanelShellClassName,
  designerPreviewPanelShellFillClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { useCustomViews } from "./custom-views-context";
import { CustomViewDefinitionJsonToolbar } from "./json/CustomViewDefinitionJsonToolbar";
import { customViewDefinitionFormJsonLabels } from "./json/custom-view-definition-json-labels";
import {
  resolveQueryNameById,
  type CustomViewFormStateImportResult,
} from "./json/export-custom-view-form-state";

const selectClassName =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm";

export function CustomViewSettingsPanel() {
  const { t } = useTranslation("common");
  const { editor, canUpdate, canDelete, requestDelete } = useCustomViews();
  const categoriesQuery = useEntityNavCategories();

  const queriesQuery = useQuery({
    queryKey: ["entity-query-definitions", "custom-views-settings"],
    queryFn: async () => {
      const result = await listEntityQueryDefinitions();
      return result.items.filter((item) => item.status === "ACTIVE");
    },
  });

  const queries = useMemo(() => queriesQuery.data ?? [], [queriesQuery.data]);
  const formJsonLabels = customViewDefinitionFormJsonLabels(t);

  const view = editor.selectedView;
  const draft = editor.draft;

  const queryOptions = useMemo(
    () =>
      queries.map((query) => ({
        value: query.id,
        label: `${query.name} (${query.sourceEntity})`,
      })),
    [queries],
  );

  const queryName = view
    ? resolveQueryNameById(queries, view.entityQueryDefinitionId)
    : undefined;

  const draftQueryName = draft
    ? resolveQueryNameById(queries, draft.entityQueryDefinitionId)
    : undefined;

  if (!view || !draft) {
    return (
      <div
        className={`${designerPreviewPanelShellClassName} ${designerPreviewPanelShellFillClassName}`}
      >
        <Text className="text-muted-foreground text-sm">
          {t("customViews.settings.empty")}
        </Text>
      </div>
    );
  }

  async function handleSave() {
    const error = await editor.saveSelectedView();
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("customViews.settings.saved"));
  }

  async function handleJsonImport(imported: CustomViewFormStateImportResult) {
    const error = await editor.applyJsonImport(imported, queries);
    if (error === "queryNotFound") {
      toast.error(t("customViews.json.view.queryNotFound"));
      return;
    }
    if (error) {
      toast.error(
        error === "Failed to apply imported JSON."
          ? t("customViews.json.view.importFailed")
          : error,
      );
      return;
    }
    toast.success(t("customViews.json.view.importSuccess"));
  }

  return (
    <div
      className={`${designerPreviewPanelShellClassName} ${designerPreviewPanelShellFillClassName}`}
    >
      <div className={designerPreviewPanelHeaderClassName}>
        <div className="min-w-0 space-y-1">
          <Text className="text-foreground text-base font-semibold">
            {view.nav.label}
          </Text>
          <Text className="text-muted-foreground text-sm">
            {view.name} · {view.viewId} · {view.sourceEntity}
          </Text>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link to={`/app/views/${view.viewId}`}>
              <Button type="button" variant="outline" size="sm">
                <ExternalLink className="size-4" />
                {t("customViews.openPage")}
              </Button>
            </Link>
            <Link to={designLayoutCustomViewPath("main", view.viewId)}>
              <Button type="button" variant="outline" size="sm">
                {t("customViews.designLayout")}
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CustomViewDefinitionJsonToolbar
            mode="edit"
            existingViewId={view.viewId}
            existingQueryName={queryName}
            canApply={canUpdate}
            labels={formJsonLabels}
            formState={{
              name: draft.name,
              description: draft.description,
              entityQueryDefinitionName: draftQueryName || queryName || "",
              viewId: view.viewId,
              navLabel: draft.navLabel,
              navIcon: draft.navIcon,
              navCategoryId: draft.navCategoryId,
              navOrder: draft.navOrder,
              hiddenFromNav: draft.hiddenFromNav,
              status: draft.status,
              ui: optionalCustomViewUIConfig(view.ui) ?? editor.importedUi,
            }}
            onImport={(imported) => void handleJsonImport(imported)}
          />
          {canDelete ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => requestDelete(view.id)}
            >
              <Trash2 className="size-4" />
              {t("customViews.deleteModal.confirm")}
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            loading={editor.isSaving}
            disabled={!canUpdate || !editor.isDirty || editor.isSaving}
            onClick={() => void handleSave()}
          >
            {t("customViews.save")}
          </Button>
        </div>
      </div>

      <div className={`${designerPreviewPanelBodyFillClassName} space-y-4 p-4`}>
        <div className="space-y-1">
          <FieldLabel htmlFor="custom-view-settings-name">
            {t("customViews.fields.name")}
          </FieldLabel>
          <Input
            id="custom-view-settings-name"
            value={draft.name}
            disabled={!canUpdate}
            onChange={(event) =>
              editor.updateDraft({ name: event.target.value })
            }
          />
        </div>
        <div className="space-y-1">
          <FieldLabel htmlFor="custom-view-settings-description">
            {t("customViews.fields.description")}
          </FieldLabel>
          <Textarea
            id="custom-view-settings-description"
            value={draft.description}
            disabled={!canUpdate}
            onChange={(event) =>
              editor.updateDraft({ description: event.target.value })
            }
          />
        </div>
        <div className="space-y-1">
          <FieldLabel htmlFor="custom-view-settings-query">
            {t("customViews.fields.query")}
          </FieldLabel>
          <Select
            id="custom-view-settings-query"
            className={selectClassName}
            value={draft.entityQueryDefinitionId}
            disabled={!canUpdate}
            onChange={(event) =>
              editor.updateDraft({
                entityQueryDefinitionId: event.target.value,
              })
            }
          >
            <option value="">{t("customViews.fields.selectQuery")}</option>
            {queryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <FieldLabel htmlFor="custom-view-settings-nav-label">
            {t("customViews.fields.navLabel")}
          </FieldLabel>
          <Input
            id="custom-view-settings-nav-label"
            value={draft.navLabel}
            disabled={!canUpdate}
            onChange={(event) =>
              editor.updateDraft({ navLabel: event.target.value })
            }
          />
        </div>
        <div className="space-y-1">
          <FieldLabel htmlFor="custom-view-settings-nav-icon">
            {t("customViews.fields.navIcon")}
          </FieldLabel>
          <Input
            id="custom-view-settings-nav-icon"
            value={draft.navIcon}
            disabled={!canUpdate}
            onChange={(event) =>
              editor.updateDraft({ navIcon: event.target.value })
            }
            placeholder="LayoutGrid"
          />
        </div>
        <div className="space-y-1">
          <FieldLabel htmlFor="custom-view-settings-category">
            {t("customViews.fields.navCategory")}
          </FieldLabel>
          <Select
            id="custom-view-settings-category"
            className={selectClassName}
            value={draft.navCategoryId}
            disabled={!canUpdate}
            onChange={(event) =>
              editor.updateDraft({ navCategoryId: event.target.value })
            }
          >
            <option value="">{t("customViews.fields.noCategory")}</option>
            {(categoriesQuery.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <FieldLabel htmlFor="custom-view-settings-order">
            {t("customViews.fields.navOrder")}
          </FieldLabel>
          <Input
            id="custom-view-settings-order"
            type="number"
            value={draft.navOrder}
            disabled={!canUpdate}
            onChange={(event) =>
              editor.updateDraft({ navOrder: event.target.value })
            }
          />
        </div>
        <div className="space-y-1">
          <FieldLabel htmlFor="custom-view-settings-status">
            {t("customViews.fields.status")}
          </FieldLabel>
          <Select
            id="custom-view-settings-status"
            className={selectClassName}
            value={draft.status}
            disabled={!canUpdate}
            onChange={(event) =>
              editor.updateDraft({
                status: event.target.value as "ACTIVE" | "PAUSED",
              })
            }
          >
            <option value="ACTIVE">{t("customViews.status.active")}</option>
            <option value="PAUSED">{t("customViews.status.paused")}</option>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.hiddenFromNav}
            disabled={!canUpdate}
            onChange={(event) =>
              editor.updateDraft({ hiddenFromNav: event.target.checked })
            }
          />
          {t("customViews.fields.hiddenFromNav")}
        </label>
      </div>
    </div>
  );
}
