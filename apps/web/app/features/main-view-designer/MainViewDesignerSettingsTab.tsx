import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { UiLayoutSummaryTab } from "@repo/ui-builder-core";
import { Button, FieldLabel, Input, Select } from "@repo/ui";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { getEntityLabel } from "../../entities/entity-catalog";
import { MainViewDesignerUnifiedPreviewPanel } from "./MainViewDesignerUnifiedPreviewPanel";
import { useMainViewDesigner } from "./main-view-designer-context";
import { createEmptySummaryTab } from "../entity-summary/resolve-summary-tabs";

export function MainViewDesignerSettingsTab() {
  const { t } = useTranslation("common");
  const { editor } = useMainViewDesigner();
  const catalog = useEntityCatalog();

  const summary = editor.layout.summary;
  const sourceEntity = summary?.sourceEntity ?? "";
  const sourceRecordId = summary?.sourceRecordId ?? "";
  const tabs = summary?.tabs ?? [];

  const entityOptions = useMemo(
    () =>
      [...catalog.items]
        .map((entry) => ({
          value: entry.name,
          label: getEntityLabel(entry),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [catalog.items],
  );

  const stringFieldOptions = useMemo(() => {
    if (!catalog.isKnownEntity(sourceEntity)) {
      return [] as readonly {
        readonly value: string;
        readonly label: string;
      }[];
    }
    try {
      const definition = catalog.getDefinition(sourceEntity);
      return Object.entries(definition.fields)
        .filter(([, meta]) => meta.type === "string")
        .map(([name]) => ({ value: name, label: name }))
        .sort((a, b) => a.label.localeCompare(b.label));
    } catch {
      return [];
    }
  }, [catalog, sourceEntity]);

  function clearSummary() {
    const { summary: _ignoredSummary, ...rest } = editor.layout;
    void _ignoredSummary;
    editor.setLayout(rest);
  }

  function writeSummary(input: {
    readonly sourceEntity: string;
    readonly sourceRecordId?: string;
    readonly tabs: readonly UiLayoutSummaryTab[];
  }) {
    const entity = input.sourceEntity.trim();
    if (!entity) {
      clearSummary();
      return;
    }
    const recordId = input.sourceRecordId?.trim() ?? "";
    editor.setLayout({
      ...editor.layout,
      summary: {
        sourceEntity: entity,
        ...(recordId.length > 0 ? { sourceRecordId: recordId } : {}),
        tabs: input.tabs,
      },
    });
  }

  function updateTab(index: number, patch: Partial<UiLayoutSummaryTab>) {
    writeSummary({
      sourceEntity,
      sourceRecordId,
      tabs: tabs.map((tab, i) => (i === index ? { ...tab, ...patch } : tab)),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card border-border flex max-w-2xl flex-col gap-4 rounded-lg border p-4">
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="main-summary-source-entity">
            {t("mainViewDesigner.summary.sourceEntity.label")}
          </FieldLabel>
          <Select
            id="main-summary-source-entity"
            value={sourceEntity}
            onChange={(event) => {
              const nextEntity = event.target.value.trim();
              if (!nextEntity) {
                clearSummary();
                return;
              }
              let defaultField = "";
              if (catalog.isKnownEntity(nextEntity)) {
                try {
                  const definition = catalog.getDefinition(nextEntity);
                  const firstString = Object.entries(definition.fields).find(
                    ([, meta]) => meta.type === "string",
                  );
                  defaultField = firstString?.[0] ?? "";
                } catch {
                  defaultField = "";
                }
              }
              writeSummary({
                sourceEntity: nextEntity,
                sourceRecordId,
                tabs:
                  tabs.length > 0
                    ? tabs
                    : [
                        {
                          ...createEmptySummaryTab(0),
                          field: defaultField,
                          label: t(
                            "mainViewDesigner.summary.tabs.defaultLabel",
                          ),
                          id: "overview",
                        },
                      ],
              });
            }}
            aria-label={t("mainViewDesigner.summary.sourceEntity.label")}
          >
            <option value="">
              {t("mainViewDesigner.summary.sourceEntity.none")}
            </option>
            {entityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <p className="text-muted-foreground text-xs">
            {t("mainViewDesigner.summary.help")}
          </p>
        </div>

        {sourceEntity ? (
          <>
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="main-summary-source-record-id">
                {t("mainViewDesigner.summary.sourceRecordId.label")}
              </FieldLabel>
              <Input
                id="main-summary-source-record-id"
                value={sourceRecordId}
                onChange={(event) =>
                  writeSummary({
                    sourceEntity,
                    sourceRecordId: event.target.value,
                    tabs,
                  })
                }
                placeholder={t(
                  "mainViewDesigner.summary.sourceRecordId.placeholder",
                )}
                aria-label={t("mainViewDesigner.summary.sourceRecordId.label")}
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <FieldLabel>
                  {t("mainViewDesigner.summary.tabs.label")}
                </FieldLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    writeSummary({
                      sourceEntity,
                      sourceRecordId,
                      tabs: [
                        ...tabs,
                        {
                          ...createEmptySummaryTab(tabs.length),
                          field: stringFieldOptions[0]?.value ?? "",
                        },
                      ],
                    })
                  }
                >
                  {t("mainViewDesigner.summary.tabs.add")}
                </Button>
              </div>

              {tabs.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  {t("mainViewDesigner.summary.tabs.empty")}
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {tabs.map((tab, index) => (
                    <li
                      key={`${tab.id}-${index}`}
                      className="border-border bg-muted/20 flex flex-col gap-2 rounded-md border p-3"
                    >
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="flex flex-col gap-1">
                          <FieldLabel
                            htmlFor={`main-summary-tab-id-${index}`}
                            className="text-xs"
                          >
                            {t("mainViewDesigner.summary.tabs.id")}
                          </FieldLabel>
                          <Input
                            id={`main-summary-tab-id-${index}`}
                            value={tab.id}
                            onChange={(event) =>
                              updateTab(index, { id: event.target.value })
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <FieldLabel
                            htmlFor={`main-summary-tab-label-${index}`}
                            className="text-xs"
                          >
                            {t("mainViewDesigner.summary.tabs.tabLabel")}
                          </FieldLabel>
                          <Input
                            id={`main-summary-tab-label-${index}`}
                            value={tab.label}
                            onChange={(event) =>
                              updateTab(index, { label: event.target.value })
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <FieldLabel
                            htmlFor={`main-summary-tab-field-${index}`}
                            className="text-xs"
                          >
                            {t("mainViewDesigner.summary.tabs.field")}
                          </FieldLabel>
                          <Select
                            id={`main-summary-tab-field-${index}`}
                            value={tab.field}
                            onChange={(event) =>
                              updateTab(index, { field: event.target.value })
                            }
                          >
                            <option value="">
                              {t("mainViewDesigner.summary.tabs.fieldNone")}
                            </option>
                            {stringFieldOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            writeSummary({
                              sourceEntity,
                              sourceRecordId,
                              tabs: tabs.filter((_, i) => i !== index),
                            })
                          }
                        >
                          {t("mainViewDesigner.summary.tabs.remove")}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}
      </div>
      <MainViewDesignerUnifiedPreviewPanel />
    </div>
  );
}
