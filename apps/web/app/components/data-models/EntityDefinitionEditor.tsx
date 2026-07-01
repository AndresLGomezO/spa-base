import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";

import {
  stripDownloadUrlFromFileReference,
  type EntityFileReference,
} from "@repo/entities";
import {
  Alert,
  Button,
  Checkbox,
  FieldLabel,
  Form,
  Heading,
  Input,
  Text,
  Textarea,
  toast,
  Select,
} from "@repo/ui";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import {
  getEntityDefinition,
  isApiClientError,
  listEntityCategories,
  listEntityDefinitions,
  patchEntityDefinition,
  type EntityCategoryRecord,
  type EntityDefinitionRecord,
  type FieldDefinitionInput,
} from "../../lib/api-client";
import { LucideIconField } from "../shared/LucideIconField";
import { EntityFormSkeleton } from "../loading/EntityFormSkeleton";
import { buildEntityDefinitionUiForSave } from "./build-entity-definition-ui-patch";
import { EntityFieldsManager } from "./EntityFieldsManager";
import { EntityIndexPlanSummaryCard } from "./EntityIndexPlanSummaryCard";
import { entityDefinitionFormJsonLabels } from "./json/entity-definition-json-labels";
import { EntityDefinitionJsonToolbar } from "./json/EntityDefinitionJsonToolbar";
import type { PlanEntityIndexesInput } from "./plan-entity-indexes";
import { useSyncCategoryNavIcon } from "./use-sync-category-nav-icon";

const ENTITY_DEFINITION_EDITOR_FORM_ID = "entity-definition-editor-form";

function sanitizeFieldDefinitionForSave(
  field: FieldDefinitionInput,
): FieldDefinitionInput {
  if (!field.defaultImage) {
    return field;
  }

  return {
    ...field,
    defaultImage: stripDownloadUrlFromFileReference(
      field.defaultImage,
    ) as EntityFileReference,
  };
}

interface EntityDefinitionEditorProps {
  readonly definitionId: string;
  readonly tenantId: string;
  readonly canUpdate?: boolean;
  readonly onSaved: (record: EntityDefinitionRecord) => void;
  readonly onCancel: () => void;
  readonly onFooterChange?: (footer: ReactNode | null) => void;
}

export function EntityDefinitionEditor({
  definitionId,
  tenantId,
  canUpdate = true,
  onSaved,
  onCancel,
  onFooterChange,
}: EntityDefinitionEditorProps) {
  const { t } = useTranslation("common");
  const { refresh } = useEntityCatalog();
  const jsonLabels = useMemo(() => entityDefinitionFormJsonLabels(t), [t]);
  const [record, setRecord] = useState<EntityDefinitionRecord | null>(null);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FieldDefinitionInput[]>([]);
  const [tenantWideRead, setTenantWideRead] = useState(false);
  const [inMemoryListQueries, setInMemoryListQueries] = useState(false);
  const [hiddenFromNav, setHiddenFromNav] = useState(false);
  const [navCategoryId, setNavCategoryId] = useState("");
  const [navOrder, setNavOrder] = useState("");
  const [navIcon, setNavIcon] = useState("");
  const [useCategoryIcon, setUseCategoryIcon] = useState(false);
  const [navCategories, setNavCategories] = useState<
    readonly EntityCategoryRecord[]
  >([]);
  const [displayField, setDisplayField] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [relationTargetDefinitions, setRelationTargetDefinitions] = useState<
    readonly { readonly name: string; readonly label: string }[]
  >([]);

  useEffect(() => {
    let cancelled = false;

    void listEntityDefinitions()
      .then((response) => {
        if (cancelled) {
          return;
        }
        setRelationTargetDefinitions(
          response.items.map((item) => ({
            name: item.name,
            label: item.label,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setRelationTargetDefinitions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void listEntityCategories()
      .then((response) => {
        if (!cancelled) {
          setNavCategories(
            [...response.items].sort((left, right) => left.order - right.order),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNavCategories([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const relationTargets = relationTargetDefinitions;

  useSyncCategoryNavIcon(
    navCategoryId,
    useCategoryIcon,
    navCategories,
    setNavIcon,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDefinition() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const loaded = await getEntityDefinition(definitionId);
        if (cancelled) {
          return;
        }
        setRecord(loaded);
        setLabel(loaded.label);
        setDescription(loaded.description ?? "");
        setFields([...loaded.fields]);
        setTenantWideRead(loaded.tenantWideRead ?? false);
        setInMemoryListQueries(loaded.inMemoryListQueries ?? false);
        setHiddenFromNav(loaded.hiddenFromNav ?? false);
        setNavCategoryId(loaded.navCategoryId ?? "");
        setNavOrder(
          loaded.navOrder !== undefined ? String(loaded.navOrder) : "",
        );
        setNavIcon(loaded.ui?.nav?.icon ?? "");
        setUseCategoryIcon(false);
        setDisplayField(loaded.displayField ?? "");
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setLoadError(
          loadError instanceof Error
            ? loadError.message
            : t("dataModels.loadFailed"),
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDefinition();

    return () => {
      cancelled = true;
    };
  }, [definitionId, t, tenantId]);

  const useModalFooter = Boolean(onFooterChange);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!onFooterChange) {
      return;
    }

    onFooterChange(
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onCancelRef.current()}
        >
          {t("entity.cancel")}
        </Button>
        {canUpdate && record && !isLoading ? (
          <Button
            type="submit"
            form={ENTITY_DEFINITION_EDITOR_FORM_ID}
            disabled={isSubmitting}
          >
            {isSubmitting ? t("loading") : t("dataModels.saveModel")}
          </Button>
        ) : null}
      </div>,
    );
  }, [canUpdate, isLoading, isSubmitting, onFooterChange, record, t]);

  useEffect(() => {
    return () => {
      onFooterChange?.(null);
    };
  }, [onFooterChange]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canUpdate || !record) {
      return;
    }

    setValidationError(null);

    const validFields = fields.filter((field) => field.name.trim());
    if (validFields.length === 0) {
      setValidationError(t("dataModels.validation.fieldsRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      const parsedNavOrder =
        navOrder.trim().length > 0 ? Number(navOrder.trim()) : null;
      const ui = buildEntityDefinitionUiForSave({
        record,
        label: label.trim(),
        fields: validFields,
        navIcon,
      });

      const updated = await patchEntityDefinition(definitionId, {
        label: label.trim(),
        description: description.trim() ? description.trim() : null,
        tenantWideRead,
        inMemoryListQueries,
        hiddenFromNav,
        navCategoryId: navCategoryId.trim() ? navCategoryId.trim() : null,
        ...(parsedNavOrder !== null && Number.isInteger(parsedNavOrder)
          ? { navOrder: parsedNavOrder }
          : navOrder.trim().length === 0
            ? { navOrder: null }
            : {}),
        displayField: displayField.trim() ? displayField.trim() : null,
        ...(ui ? { ui } : {}),
        fields: validFields.map((field) => ({
          ...sanitizeFieldDefinitionForSave(field),
          name: field.name.trim(),
          ...(field.type === "enum"
            ? {
                enumValues: (field.enumValues ?? [])
                  .map((value) => value.trim())
                  .filter(Boolean),
              }
            : {}),
        })),
      });
      await refresh();
      onSaved(updated);
    } catch (submitError) {
      if (isApiClientError(submitError)) {
        toast.error(submitError.message);
      } else {
        toast.error(
          submitError instanceof Error
            ? submitError.message
            : t("dataModels.updateFailed"),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const indexPlanInput = useMemo((): PlanEntityIndexesInput | null => {
    if (!record) {
      return null;
    }

    return {
      tenantId,
      name: record.name,
      label,
      fields,
      tenantWideRead,
      inMemoryListQueries,
      record,
      navIcon,
    };
  }, [
    tenantId,
    record,
    label,
    fields,
    tenantWideRead,
    inMemoryListQueries,
    navIcon,
  ]);

  const entityFormState = useMemo(
    () => ({
      name: record?.name ?? "",
      label,
      description,
      fields,
      tenantWideRead,
      inMemoryListQueries,
      hiddenFromNav,
      navCategoryId,
      navOrder,
      navIcon,
      displayField,
    }),
    [
      record?.name,
      label,
      description,
      fields,
      tenantWideRead,
      inMemoryListQueries,
      hiddenFromNav,
      navCategoryId,
      navOrder,
      navIcon,
      displayField,
    ],
  );

  if (isLoading) {
    return <EntityFormSkeleton />;
  }

  if (!record || !indexPlanInput) {
    return loadError ? <Alert>{loadError}</Alert> : null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Heading level={2}>
          {t("dataModels.editTitle", { name: record.name })}
        </Heading>
        <EntityDefinitionJsonToolbar
          mode="edit"
          existingName={record.name}
          canApply={canUpdate}
          formState={entityFormState}
          labels={jsonLabels}
          onImport={(imported) => {
            setLabel(imported.label);
            setDescription(imported.description);
            setFields(imported.fields);
            setTenantWideRead(imported.tenantWideRead);
            setInMemoryListQueries(imported.inMemoryListQueries);
            setHiddenFromNav(imported.hiddenFromNav);
            setNavCategoryId(imported.navCategoryId);
            setNavOrder(imported.navOrder);
            setNavIcon(imported.navIcon);
            setDisplayField(imported.displayField);
            setValidationError(null);
          }}
        />
      </div>

      {validationError ? <Alert>{validationError}</Alert> : null}

      <Form
        id={ENTITY_DEFINITION_EDITOR_FORM_ID}
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div>
          <FieldLabel htmlFor="edit-model-name">
            {t("dataModels.modelName")}
          </FieldLabel>
          <Input id="edit-model-name" value={record.name} disabled readOnly />
          <Text className="text-muted-foreground mt-1 text-sm">
            {t("dataModels.nameReadOnly")}
          </Text>
        </div>

        <div>
          <FieldLabel htmlFor="edit-model-label">
            {t("dataModels.modelLabel")}
          </FieldLabel>
          <Input
            id="edit-model-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            disabled={!canUpdate}
          />
        </div>

        <div>
          <FieldLabel htmlFor="edit-model-description">
            {t("dataModels.modelDescription")}
          </FieldLabel>
          <Textarea
            id="edit-model-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("dataModels.modelDescriptionPlaceholder")}
            disabled={!canUpdate}
          />
          <Text className="text-muted-foreground mt-1 text-sm">
            {t("dataModels.modelDescriptionHint")}
          </Text>
        </div>

        <div className="space-y-2">
          <Checkbox
            id="edit-tenant-wide-read"
            label={t("dataModels.tenantWideRead")}
            checked={tenantWideRead}
            disabled={!canUpdate}
            onChange={(event) => setTenantWideRead(event.target.checked)}
          />
          <Text className="text-muted-foreground text-sm">
            {t("dataModels.tenantWideReadHint")}
          </Text>
        </div>

        <div className="space-y-2">
          <Checkbox
            id="edit-in-memory-list-queries"
            label={t("dataModels.inMemoryListQueries.label")}
            checked={inMemoryListQueries}
            disabled={!canUpdate}
            onChange={(event) => setInMemoryListQueries(event.target.checked)}
          />
          <Text className="text-muted-foreground text-sm">
            {t("dataModels.inMemoryListQueries.hint")}
          </Text>
        </div>

        <div className="space-y-2">
          <Checkbox
            id="edit-hidden-from-nav"
            label={t("dataModels.hiddenFromNav")}
            checked={hiddenFromNav}
            disabled={!canUpdate}
            onChange={(event) => setHiddenFromNav(event.target.checked)}
          />
          <Text className="text-muted-foreground text-sm">
            {t("dataModels.hiddenFromNavHint")}
          </Text>
        </div>

        {canUpdate ? (
          <>
            <div>
              <FieldLabel htmlFor="edit-nav-category">
                {t("dataModels.navCategory")}
              </FieldLabel>
              <Select
                id="edit-nav-category"
                className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                value={navCategoryId}
                disabled={!canUpdate}
                onChange={(event) => {
                  const nextCategoryId = event.target.value;
                  setNavCategoryId(nextCategoryId);
                  if (!nextCategoryId) {
                    setUseCategoryIcon(false);
                  }
                }}
              >
                <option value="">{t("dataModels.navCategoryNone")}</option>
                {navCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <Text className="text-muted-foreground mt-1 text-sm">
                {t("dataModels.navCategoryHint")}
              </Text>
            </div>
            <div>
              <FieldLabel htmlFor="edit-nav-order">
                {t("dataModels.navOrder")}
              </FieldLabel>
              <Input
                id="edit-nav-order"
                type="number"
                value={navOrder}
                disabled={!canUpdate}
                onChange={(event) => setNavOrder(event.target.value)}
              />
              <Text className="text-muted-foreground mt-1 text-sm">
                {t("dataModels.navOrderHint")}
              </Text>
            </div>

            {navCategoryId ? (
              <div className="space-y-2">
                <Checkbox
                  id="edit-use-category-icon"
                  label={t("dataModels.useCategoryIcon")}
                  checked={useCategoryIcon}
                  disabled={!canUpdate}
                  onChange={(event) => setUseCategoryIcon(event.target.checked)}
                />
                <Text className="text-muted-foreground text-sm">
                  {t("dataModels.useCategoryIconHint")}
                </Text>
              </div>
            ) : null}

            <LucideIconField
              id="edit-nav-icon"
              label={t("dataModels.navIcon")}
              hint={t("dataModels.navIconHint")}
              value={navIcon}
              placeholder="Database"
              disabled={!canUpdate || useCategoryIcon}
              onChange={setNavIcon}
            />
          </>
        ) : null}

        {fields.some((f) => f.type === "string") ? (
          <div>
            <FieldLabel htmlFor="edit-display-field">
              {t("dataModels.displayField", {
                defaultValue: "Display Field",
              })}
            </FieldLabel>
            <Select
              id="edit-display-field"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
              value={displayField}
              disabled={!canUpdate}
              onChange={(event) => setDisplayField(event.target.value)}
            >
              <option value="">{t("dataModels.displayFieldAuto")}</option>
              {fields
                .filter((f) => f.type === "string" && f.name.trim())
                .map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name}
                  </option>
                ))}
            </Select>
            <Text className="text-muted-foreground mt-1 text-sm">
              {t("dataModels.displayFieldHint", {
                defaultValue:
                  "Which field is shown when this entity is referenced by others.",
              })}
            </Text>
          </div>
        ) : null}

        <EntityIndexPlanSummaryCard planInput={indexPlanInput} />

        <EntityFieldsManager
          fields={fields}
          entityName={record?.name}
          onChange={setFields}
          canEdit={canUpdate}
          relationTargets={relationTargets}
          indexPlanInput={indexPlanInput}
        />

        {!useModalFooter ? (
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t("entity.cancel")}
            </Button>
            {canUpdate ? (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("loading") : t("dataModels.saveModel")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </Form>
    </div>
  );
}
