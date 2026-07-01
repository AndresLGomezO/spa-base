import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Button,
  FieldLabel,
  Heading,
  Input,
  Modal,
  Select,
  Text,
  Textarea,
  toast,
} from "@repo/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { slugCustomViewId } from "@repo/custom-views/browser";
import type {
  CustomViewsCatalogEnvelope,
  CustomViewUIConfig,
} from "@repo/custom-views/browser";

import { usePermission } from "../../auth/usePermission";
import { useCustomViewCatalog } from "../../custom-views/custom-view-catalog-context";
import {
  optionalCustomViewUIConfig,
  toApiCustomViewUi,
  toApiCustomViewUiPatch,
} from "../../custom-views/normalize-custom-view-ui";
import { useEntityNavCategories } from "../../hooks/useEntityNavCategories";
import {
  createCustomView,
  deleteCustomView,
  isApiClientError,
  listEntityQueryDefinitions,
  patchCustomView,
  putCustomViewsCatalog,
  type CustomViewRecord,
} from "../../lib/api-client";
import { designLayoutCustomViewPath } from "../../routing/design-layout-nav";
import { CustomViewDefinitionJsonToolbar } from "./json/CustomViewDefinitionJsonToolbar";
import {
  customViewDefinitionFormJsonLabels,
  customViewsCatalogJsonLabels,
} from "./json/custom-view-definition-json-labels";
import { CustomViewsCatalogJsonImportDialog } from "./json/CustomViewsCatalogJsonImportDialog";
import { CustomViewsCatalogJsonViewDialog } from "./json/CustomViewsCatalogJsonViewDialog";
import {
  resolveQueryIdByName,
  resolveQueryNameById,
  type CustomViewFormStateImportResult,
} from "./json/export-custom-view-form-state";

const selectClassName =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm";

interface CustomViewFormState {
  readonly name: string;
  readonly description: string;
  readonly entityQueryDefinitionId: string;
  readonly navLabel: string;
  readonly navIcon: string;
  readonly navCategoryId: string;
  readonly navOrder: string;
  readonly hiddenFromNav: boolean;
  readonly status: "ACTIVE" | "PAUSED";
}

function emptyForm(): CustomViewFormState {
  return {
    name: "",
    description: "",
    entityQueryDefinitionId: "",
    navLabel: "",
    navIcon: "",
    navCategoryId: "",
    navOrder: "",
    hiddenFromNav: false,
    status: "ACTIVE",
  };
}

function formFromRecord(record: CustomViewRecord): CustomViewFormState {
  return {
    name: record.name,
    description: record.description ?? "",
    entityQueryDefinitionId: record.entityQueryDefinitionId,
    navLabel: record.nav.label,
    navIcon: record.nav.icon ?? "",
    navCategoryId: record.navCategoryId ?? "",
    navOrder: record.navOrder !== undefined ? String(record.navOrder) : "",
    hiddenFromNav: record.hiddenFromNav ?? false,
    status: record.status,
  };
}

export function CustomViewsView() {
  const { t } = useTranslation("common");
  const { items, refresh, isLoading, error } = useCustomViewCatalog();
  const categoriesQuery = useEntityNavCategories();
  const canCreate = usePermission("customView.create");
  const canUpdate = usePermission("customView.update");
  const canDelete = usePermission("customView.delete");

  const queriesQuery = useQuery({
    queryKey: ["entity-query-definitions", "custom-views-settings"],
    queryFn: async () => {
      const result = await listEntityQueryDefinitions();
      return result.items.filter((item) => item.status === "ACTIVE");
    },
  });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CustomViewRecord | null>(null);
  const [form, setForm] = useState<CustomViewFormState>(emptyForm);
  const [importedUi, setImportedUi] = useState<CustomViewUIConfig | undefined>(
    undefined,
  );
  const [importedViewId, setImportedViewId] = useState<string | undefined>(
    undefined,
  );

  const formJsonLabels = useMemo(
    () => customViewDefinitionFormJsonLabels(t),
    [t],
  );
  const catalogLabels = useMemo(() => customViewsCatalogJsonLabels(t), [t]);
  const canReplaceCatalog = canCreate && canUpdate && canDelete;
  const queries = useMemo(() => queriesQuery.data ?? [], [queriesQuery.data]);

  const queryOptions = useMemo(
    () =>
      (queriesQuery.data ?? []).map((query) => ({
        value: query.id,
        label: `${query.name} (${query.sourceEntity})`,
      })),
    [queriesQuery.data],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const navOrder =
        form.navOrder.trim().length > 0 ? Number(form.navOrder) : undefined;
      const payload = {
        name: form.name.trim(),
        ...(form.description.trim()
          ? { description: form.description.trim() }
          : {}),
        entityQueryDefinitionId: form.entityQueryDefinitionId,
        status: form.status,
        hiddenFromNav: form.hiddenFromNav,
        ...(form.navCategoryId.trim()
          ? { navCategoryId: form.navCategoryId.trim() }
          : {}),
        ...(navOrder !== undefined && !Number.isNaN(navOrder)
          ? { navOrder }
          : {}),
        nav: {
          label: form.navLabel.trim() || form.name.trim(),
          ...(form.navIcon.trim() ? { icon: form.navIcon.trim() } : {}),
        },
      };

      if (editing) {
        return patchCustomView(editing.id, payload);
      }

      return createCustomView({
        ...payload,
        viewId: importedViewId ?? slugCustomViewId(form.name),
        ...(importedUi !== undefined
          ? { ui: toApiCustomViewUi(importedUi) }
          : {}),
      });
    },
    onSuccess: async () => {
      await refresh();
      setEditorOpen(false);
      setEditing(null);
      setForm(emptyForm());
      setImportedUi(undefined);
      setImportedViewId(undefined);
      toast.success(t("customViews.saveSuccess"));
    },
    onError: () => {
      toast.error(t("customViews.saveFailed"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCustomView(id),
    onSuccess: async () => {
      await refresh();
      toast.success(t("customViews.deleteSuccess"));
    },
    onError: () => {
      toast.error(t("customViews.deleteFailed"));
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setImportedUi(undefined);
    setImportedViewId(undefined);
    setEditorOpen(true);
  }

  function openEdit(record: CustomViewRecord) {
    setEditing(record);
    setForm(formFromRecord(record));
    setImportedUi(undefined);
    setImportedViewId(undefined);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditing(null);
    setForm(emptyForm());
    setImportedUi(undefined);
    setImportedViewId(undefined);
  }

  const applyImportedForm = useCallback(
    (imported: CustomViewFormStateImportResult) => {
      const queryId = resolveQueryIdByName(
        queries,
        imported.entityQueryDefinitionName,
      );
      setForm({
        name: imported.name,
        description: imported.description,
        entityQueryDefinitionId: queryId ?? "",
        navLabel: imported.navLabel,
        navIcon: imported.navIcon,
        navCategoryId: imported.navCategoryId,
        navOrder: imported.navOrder,
        hiddenFromNav: imported.hiddenFromNav,
        status: imported.status,
      });
      setImportedUi(imported.ui);
      setImportedViewId(imported.viewId);
    },
    [queries],
  );

  const handleJsonImport = useCallback(
    async (imported: CustomViewFormStateImportResult) => {
      if (editing) {
        const queryId = resolveQueryIdByName(
          queries,
          imported.entityQueryDefinitionName,
        );
        if (!queryId) {
          toast.error(t("customViews.json.view.queryNotFound"));
          return;
        }

        const navOrder =
          imported.navOrder.trim().length > 0
            ? Number(imported.navOrder)
            : undefined;

        try {
          await patchCustomView(editing.id, {
            name: imported.name,
            ...(imported.description.trim()
              ? { description: imported.description.trim() }
              : {}),
            entityQueryDefinitionId: queryId,
            status: imported.status,
            hiddenFromNav: imported.hiddenFromNav,
            ...(imported.navCategoryId.trim()
              ? { navCategoryId: imported.navCategoryId.trim() }
              : {}),
            ...(navOrder !== undefined && !Number.isNaN(navOrder)
              ? { navOrder }
              : {}),
            nav: {
              label: imported.navLabel.trim() || imported.name.trim(),
              ...(imported.navIcon.trim()
                ? { icon: imported.navIcon.trim() }
                : {}),
            },
            ...(imported.ui !== undefined
              ? { ui: toApiCustomViewUiPatch(imported.ui) }
              : {}),
          });
          await refresh();
          setEditing((current) =>
            current
              ? {
                  ...current,
                  name: imported.name,
                  description: imported.description,
                  entityQueryDefinitionId: queryId,
                  status: imported.status,
                  hiddenFromNav: imported.hiddenFromNav,
                  nav: {
                    label: imported.navLabel.trim() || imported.name.trim(),
                    ...(imported.navIcon.trim()
                      ? { icon: imported.navIcon.trim() }
                      : {}),
                  },
                  ...(imported.ui !== undefined
                    ? { ui: toApiCustomViewUi(imported.ui) }
                    : {}),
                }
              : current,
          );
          applyImportedForm(imported);
          toast.success(t("customViews.json.view.importSuccess"));
        } catch (importError) {
          toast.error(
            isApiClientError(importError)
              ? importError.message
              : t("customViews.json.view.importFailed"),
          );
        }
        return;
      }

      applyImportedForm(imported);
    },
    [applyImportedForm, editing, queries, refresh, t],
  );

  const handleCatalogImport = useCallback(
    async (catalog: CustomViewsCatalogEnvelope) => {
      try {
        await putCustomViewsCatalog(catalog);
        toast.success(catalogLabels.importSuccess);
        await refresh();
      } catch (importError) {
        toast.error(
          isApiClientError(importError)
            ? importError.message
            : catalogLabels.importFailed,
        );
      }
    },
    [catalogLabels.importFailed, catalogLabels.importSuccess, refresh],
  );

  const editingQueryName = editing
    ? resolveQueryNameById(queries, editing.entityQueryDefinitionId)
    : undefined;

  const formQueryName = resolveQueryNameById(
    queries,
    form.entityQueryDefinitionId,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Heading level={1}>{t("customViews.title")}</Heading>
          <Text className="text-muted-foreground">
            {t("customViews.subtitle")}
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CustomViewsCatalogJsonViewDialog
            items={items}
            queries={queries}
            labels={catalogLabels}
          />
          <CustomViewsCatalogJsonImportDialog
            existingItems={items}
            canApply={canReplaceCatalog}
            labels={catalogLabels}
            onApply={(catalog) => void handleCatalogImport(catalog)}
          />
          {canCreate ? (
            <Button type="button" onClick={openCreate}>
              {t("customViews.create")}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <Alert>{error}</Alert> : null}
      {isLoading ? <Text>{t("loading")}</Text> : null}

      {!isLoading && items.length === 0 ? (
        <Text className="text-muted-foreground">{t("customViews.empty")}</Text>
      ) : null}

      <div className="space-y-3">
        {items.map((view) => {
          const linkedQuery = queriesQuery.data?.find(
            (query) => query.id === view.entityQueryDefinitionId,
          );
          return (
            <div
              key={view.id}
              className="border-border flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <div className="font-medium">{view.nav.label}</div>
                <Text className="text-muted-foreground text-sm">
                  {view.name} · {view.sourceEntity}
                  {linkedQuery ? ` · ${linkedQuery.name}` : ""}
                </Text>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
                {canUpdate ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(view)}
                  >
                    <Pencil className="size-4" />
                    {t("customViews.edit")}
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(view.id)}
                  >
                    <Trash2 className="size-4" />
                    {t("customViews.delete")}
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={editorOpen}
        onClose={closeEditor}
        title={
          editing ? t("customViews.editTitle") : t("customViews.createTitle")
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeEditor}>
              {t("customViews.cancel")}
            </Button>
            <Button
              type="button"
              loading={saveMutation.isPending}
              disabled={saveMutation.isPending || !form.name.trim()}
              onClick={() => saveMutation.mutate()}
            >
              {t("customViews.save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <CustomViewDefinitionJsonToolbar
            mode={editing ? "edit" : "create"}
            existingViewId={editing?.viewId}
            existingQueryName={editingQueryName}
            canApply={editing ? canUpdate : canCreate}
            labels={formJsonLabels}
            formState={{
              name: form.name,
              description: form.description,
              entityQueryDefinitionName:
                formQueryName || editingQueryName || "",
              viewId: editing?.viewId ?? importedViewId,
              navLabel: form.navLabel,
              navIcon: form.navIcon,
              navCategoryId: form.navCategoryId,
              navOrder: form.navOrder,
              hiddenFromNav: form.hiddenFromNav,
              status: form.status,
              ui: optionalCustomViewUIConfig(editing?.ui) ?? importedUi,
            }}
            onImport={(imported) => void handleJsonImport(imported)}
          />
          <div className="space-y-1">
            <FieldLabel htmlFor="custom-view-name">
              {t("customViews.fields.name")}
            </FieldLabel>
            <Input
              id="custom-view-name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <FieldLabel htmlFor="custom-view-description">
              {t("customViews.fields.description")}
            </FieldLabel>
            <Textarea
              id="custom-view-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <FieldLabel htmlFor="custom-view-query">
              {t("customViews.fields.query")}
            </FieldLabel>
            <Select
              id="custom-view-query"
              className={selectClassName}
              value={form.entityQueryDefinitionId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  entityQueryDefinitionId: event.target.value,
                }))
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
            <FieldLabel htmlFor="custom-view-nav-label">
              {t("customViews.fields.navLabel")}
            </FieldLabel>
            <Input
              id="custom-view-nav-label"
              value={form.navLabel}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  navLabel: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <FieldLabel htmlFor="custom-view-nav-icon">
              {t("customViews.fields.navIcon")}
            </FieldLabel>
            <Input
              id="custom-view-nav-icon"
              value={form.navIcon}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  navIcon: event.target.value,
                }))
              }
              placeholder="LayoutGrid"
            />
          </div>
          <div className="space-y-1">
            <FieldLabel htmlFor="custom-view-category">
              {t("customViews.fields.navCategory")}
            </FieldLabel>
            <Select
              id="custom-view-category"
              className={selectClassName}
              value={form.navCategoryId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  navCategoryId: event.target.value,
                }))
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
            <FieldLabel htmlFor="custom-view-order">
              {t("customViews.fields.navOrder")}
            </FieldLabel>
            <Input
              id="custom-view-order"
              type="number"
              value={form.navOrder}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  navOrder: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <FieldLabel htmlFor="custom-view-status">
              {t("customViews.fields.status")}
            </FieldLabel>
            <Select
              id="custom-view-status"
              className={selectClassName}
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as "ACTIVE" | "PAUSED",
                }))
              }
            >
              <option value="ACTIVE">{t("customViews.status.active")}</option>
              <option value="PAUSED">{t("customViews.status.paused")}</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.hiddenFromNav}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  hiddenFromNav: event.target.checked,
                }))
              }
            />
            {t("customViews.fields.hiddenFromNav")}
          </label>
        </div>
      </Modal>
    </div>
  );
}
