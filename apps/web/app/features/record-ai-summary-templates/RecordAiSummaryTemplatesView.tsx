import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  SearchField,
  SearchableMultiSelectDropdown,
  Text,
  Textarea,
  toast,
} from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { cn } from "@repo/theme/utils";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import {
  formatFieldLabel,
  getEntityLabel,
} from "../../entities/entity-catalog";
import {
  deleteAiRecordSummaryTemplate,
  listAiRecordSummaryTemplates,
  upsertAiRecordSummaryTemplate,
  type AiRecordSummaryTemplatePayload,
} from "../../lib/api-client";
import {
  designerPreviewColumnClassName,
  designerTreeTabRootClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { ItemListDesignerTreePanelShell } from "../item-list-designer/ItemListDesignerTreePanelShell";
import { designerTreePanelShellClassName } from "../ui-builder/designer-tree-workbench-classes";

const EMPTY_TEMPLATE: AiRecordSummaryTemplatePayload = {
  textTemplate: "",
  jsonFields: [],
  embeddingFields: [],
  piiLevel: {},
};

const PII_LEVELS = ["public", "masked", "excluded"] as const;

function extractTemplateFields(textTemplate: string): string[] {
  const found = new Set<string>();
  for (const match of textTemplate.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
    const path = match[1]?.trim();
    if (path) found.add(path);
  }
  return [...found];
}

export function RecordAiSummaryTemplatesView({
  canUpdate,
  canDelete,
}: {
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
}) {
  const { t } = useTranslation("common");
  const { items: entities, isLoading: catalogLoading } = useEntityCatalog();

  const [templatesByEntity, setTemplatesByEntity] = useState<
    ReadonlyMap<string, AiRecordSummaryTemplatePayload>
  >(new Map());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [draft, setDraft] =
    useState<AiRecordSummaryTemplatePayload>(EMPTY_TEMPLATE);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const result = await listAiRecordSummaryTemplates();
        if (cancelled) return;
        setTemplatesByEntity(
          new Map(result.items.map((item) => [item.entityName, item.template])),
        );
      } catch (error) {
        if (cancelled) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : t("recordAiSummaryTemplates.loadError"),
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const filteredEntities = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...entities].sort((a, b) =>
      getEntityLabel(a).localeCompare(getEntityLabel(b)),
    );
    if (!query) return sorted;
    return sorted.filter((entity) => {
      const label = getEntityLabel(entity).toLowerCase();
      return label.includes(query) || entity.name.toLowerCase().includes(query);
    });
  }, [entities, search]);

  useEffect(() => {
    if (!selectedEntity && filteredEntities[0]) {
      setSelectedEntity(filteredEntities[0].name);
    }
  }, [filteredEntities, selectedEntity]);

  useEffect(() => {
    if (!selectedEntity) {
      setDraft(EMPTY_TEMPLATE);
      return;
    }
    setDraft(templatesByEntity.get(selectedEntity) ?? EMPTY_TEMPLATE);
  }, [selectedEntity, templatesByEntity]);

  const selectedDefinition = entities.find(
    (entity) => entity.name === selectedEntity,
  );

  const fieldOptions = useMemo(() => {
    if (!selectedDefinition) return [];
    return Object.keys(selectedDefinition.fields)
      .sort((a, b) => a.localeCompare(b))
      .map((fieldName) => ({
        value: fieldName,
        label: formatFieldLabel(fieldName, selectedDefinition),
      }));
  }, [selectedDefinition]);

  const piiFields = useMemo(() => {
    const names = new Set<string>([
      ...draft.jsonFields,
      ...draft.embeddingFields,
      ...extractTemplateFields(draft.textTemplate),
      ...Object.keys(draft.piiLevel),
    ]);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [draft]);

  const hasExistingTemplate = Boolean(
    selectedEntity && templatesByEntity.has(selectedEntity),
  );

  async function handleSave() {
    if (!selectedEntity || !canUpdate) return;
    setIsSaving(true);
    try {
      const saved = await upsertAiRecordSummaryTemplate(selectedEntity, draft);
      setTemplatesByEntity((prev) => {
        const next = new Map(prev);
        next.set(selectedEntity, saved.template);
        return next;
      });
      setDraft(saved.template);
      toast.success(t("recordAiSummaryTemplates.saved"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("recordAiSummaryTemplates.saveError"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClear() {
    if (!selectedEntity || !canDelete || !hasExistingTemplate) return;
    setIsClearing(true);
    try {
      await deleteAiRecordSummaryTemplate(selectedEntity);
      setTemplatesByEntity((prev) => {
        const next = new Map(prev);
        next.delete(selectedEntity);
        return next;
      });
      setDraft(EMPTY_TEMPLATE);
      toast.success(t("recordAiSummaryTemplates.cleared"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("recordAiSummaryTemplates.clearError"),
      );
    } finally {
      setIsClearing(false);
    }
  }

  if (isLoading || catalogLoading) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("recordAiSummaryTemplates.loading")}
      </Text>
    );
  }

  if (loadError) {
    return <Text className="text-destructive text-sm">{loadError}</Text>;
  }

  const entityList = (
    <>
      {filteredEntities.length === 0 ? (
        <Text className="text-muted-foreground px-2 py-3 text-sm">
          {t("recordAiSummaryTemplates.list.empty")}
        </Text>
      ) : (
        <ul className="space-y-0.5 p-1">
          {filteredEntities.map((entity) => {
            const selected = entity.name === selectedEntity;
            const configured = templatesByEntity.has(entity.name);
            return (
              <li key={entity.name}>
                <button
                  type="button"
                  onClick={() => setSelectedEntity(entity.name)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm",
                    selected
                      ? "bg-muted ring-border ring-1 ring-inset"
                      : "hover:bg-muted/60",
                  )}
                >
                  <span className="min-w-0 truncate font-medium">
                    {getEntityLabel(entity)}
                  </span>
                  {configured ? (
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {t("recordAiSummaryTemplates.list.configured")}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  return (
    <div className={designerTreeTabRootClassName}>
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        <div className="shrink-0 min-w-0">
          <ItemListDesignerTreePanelShell
            title={t("recordAiSummaryTemplates.list.title")}
            expandLabel={t("recordAiSummaryTemplates.list.expandPanel")}
            collapseLabel={t("recordAiSummaryTemplates.list.collapsePanel")}
            expandedClassName={designerTreePanelShellClassName}
            collapsedClassName={designerTreePanelShellClassName}
            collapsedContent={
              <Text className="text-muted-foreground px-1 text-xs">
                {t("recordAiSummaryTemplates.list.title")}
              </Text>
            }
            scopeSection={
              <div className="w-full min-w-0 px-2 pb-2">
                <SearchField
                  value={search}
                  onChange={setSearch}
                  placeholder={t(
                    "recordAiSummaryTemplates.list.searchPlaceholder",
                  )}
                  ariaLabel={t(
                    "recordAiSummaryTemplates.list.searchPlaceholder",
                  )}
                  clearAriaLabel={t(
                    "recordAiSummaryTemplates.list.searchClear",
                  )}
                  className="max-w-none min-w-0 w-full"
                />
              </div>
            }
          >
            {entityList}
          </ItemListDesignerTreePanelShell>
        </div>

        <div className={designerPreviewColumnClassName}>
          {!selectedEntity ? (
            <Text className="text-muted-foreground text-sm">
              {t("recordAiSummaryTemplates.settings.empty")}
            </Text>
          ) : (
            <div className="space-y-4 overflow-y-auto p-1">
              <div className="space-y-1">
                <Text className="text-base font-medium">
                  {selectedDefinition
                    ? getEntityLabel(selectedDefinition)
                    : selectedEntity}
                </Text>
                <Text className="text-muted-foreground text-sm">
                  {t("recordAiSummaryTemplates.settings.description")}
                </Text>
              </div>

              <label className="block space-y-1">
                <Text className="text-sm font-medium">
                  {t("recordAiSummaryTemplates.fields.textTemplate")}
                </Text>
                <Textarea
                  value={draft.textTemplate}
                  disabled={!canUpdate}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      textTemplate: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder={t(
                    "recordAiSummaryTemplates.fields.textTemplatePlaceholder",
                  )}
                />
              </label>

              <div className="space-y-1">
                <Text className="text-sm font-medium">
                  {t("recordAiSummaryTemplates.fields.jsonFields")}
                </Text>
                <SearchableMultiSelectDropdown
                  options={fieldOptions}
                  selected={draft.jsonFields}
                  onChange={(values) =>
                    setDraft((prev) => ({ ...prev, jsonFields: values }))
                  }
                  disabled={!canUpdate}
                  ariaLabel={t("recordAiSummaryTemplates.fields.jsonFields")}
                  placeholder={t(
                    "recordAiSummaryTemplates.fields.fieldsPlaceholder",
                  )}
                  selectedCountLabel={(count) =>
                    t("recordAiSummaryTemplates.fields.selectedCount", {
                      count,
                    })
                  }
                  searchPlaceholder={t(
                    "recordAiSummaryTemplates.fields.searchFields",
                  )}
                  noResultsLabel={t("recordAiSummaryTemplates.fields.noFields")}
                  removeAriaLabel={(label) =>
                    t("recordAiSummaryTemplates.fields.removeField", { label })
                  }
                />
              </div>

              <div className="space-y-1">
                <Text className="text-sm font-medium">
                  {t("recordAiSummaryTemplates.fields.embeddingFields")}
                </Text>
                <SearchableMultiSelectDropdown
                  options={fieldOptions}
                  selected={draft.embeddingFields}
                  onChange={(values) =>
                    setDraft((prev) => ({ ...prev, embeddingFields: values }))
                  }
                  disabled={!canUpdate}
                  ariaLabel={t(
                    "recordAiSummaryTemplates.fields.embeddingFields",
                  )}
                  placeholder={t(
                    "recordAiSummaryTemplates.fields.fieldsPlaceholder",
                  )}
                  selectedCountLabel={(count) =>
                    t("recordAiSummaryTemplates.fields.selectedCount", {
                      count,
                    })
                  }
                  searchPlaceholder={t(
                    "recordAiSummaryTemplates.fields.searchFields",
                  )}
                  noResultsLabel={t("recordAiSummaryTemplates.fields.noFields")}
                  removeAriaLabel={(label) =>
                    t("recordAiSummaryTemplates.fields.removeField", { label })
                  }
                />
                <Text className="text-muted-foreground text-xs">
                  {t("recordAiSummaryTemplates.fields.embeddingFieldsHint")}
                </Text>
              </div>

              <div className="space-y-2">
                <Text className="text-sm font-medium">
                  {t("recordAiSummaryTemplates.fields.piiLevel")}
                </Text>
                {piiFields.length === 0 ? (
                  <Text className="text-muted-foreground text-sm">
                    {t("recordAiSummaryTemplates.fields.piiEmpty")}
                  </Text>
                ) : (
                  <div className="space-y-2">
                    {piiFields.map((fieldName) => (
                      <label
                        key={fieldName}
                        className="grid grid-cols-[1fr_auto] items-center gap-3"
                      >
                        <Text className="truncate text-sm">{fieldName}</Text>
                        <Select
                          className="min-w-36"
                          value={draft.piiLevel[fieldName] ?? "public"}
                          disabled={!canUpdate}
                          onChange={(event) => {
                            const value = event.target.value as
                              | (typeof PII_LEVELS)[number]
                              | "public";
                            setDraft((prev) => {
                              const next = { ...prev.piiLevel };
                              if (value === "public") {
                                delete next[fieldName];
                              } else {
                                next[fieldName] = value;
                              }
                              return { ...prev, piiLevel: next };
                            });
                          }}
                        >
                          {PII_LEVELS.map((level) => (
                            <option key={level} value={level}>
                              {level === "public"
                                ? t("recordAiSummaryTemplates.piiLevels.public")
                                : level === "masked"
                                  ? t(
                                      "recordAiSummaryTemplates.piiLevels.masked",
                                    )
                                  : t(
                                      "recordAiSummaryTemplates.piiLevels.excluded",
                                    )}
                            </option>
                          ))}
                        </Select>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {canUpdate ? (
                  <Button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={isSaving || !draft.textTemplate.trim()}
                  >
                    {isSaving
                      ? t("recordAiSummaryTemplates.saving")
                      : t("recordAiSummaryTemplates.save")}
                  </Button>
                ) : null}
                {canDelete && hasExistingTemplate ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleClear()}
                    disabled={isClearing}
                  >
                    {isClearing
                      ? t("recordAiSummaryTemplates.clearing")
                      : t("recordAiSummaryTemplates.clear")}
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
