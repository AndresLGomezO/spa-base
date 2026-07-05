import { useMemo } from "react";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import {
  resolvePreviewStrategy,
  toEditableLayoutDocument,
} from "@repo/ui-builder-core";
import { Button, Input, Select, Text, toast } from "@repo/ui";
import { useColorScheme } from "@repo/theme/react";
import { useTranslation } from "react-i18next";

import { getEntityLabel } from "../../../entities/entity-catalog";
import { useEntityCatalog } from "../../../entities/entity-catalog-context";
import { createEntityLayoutRenderContext } from "../create-entity-layout-render-context";
import {
  designerPreviewPanelBodyFillClassName,
  designerPreviewPanelHeaderClassName,
  designerPreviewPanelShellClassName,
  designerPreviewPanelShellFillClassName,
} from "../designer-tree-workbench-classes";
import { UnifiedDesignerPreviewPanel } from "../../unified-builder/UnifiedDesignerPreviewPanel";
import { PresetListBadge } from "./PresetListBadge";
import { usePresets } from "./presets-context";
import {
  resolvePresetPreviewLayout,
  resolvePresetPreviewSurface,
} from "./resolve-preset-preview-layout";

const PRESET_KINDS = [
  "layout-document",
  "column",
  "grid-track",
  "component-row",
] as const;

export function PresetDetailPanel() {
  const { t, i18n } = useTranslation("common");
  const { colorScheme } = useColorScheme();
  const { items: entities, getDefinition } = useEntityCatalog();
  const { editor, canUpdate } = usePresets();

  const entry = editor.selectedEntry;
  const draft = editor.draft;
  const isPlatform = entry?.source === "platform";
  const readOnly = !canUpdate || isPlatform;

  const previewEntityName = useMemo(() => {
    const hinted = entry?.tenantPreset?.sourceEntityName;
    if (hinted && entities.some((item) => item.name === hinted)) {
      return hinted;
    }
    return entities[0]?.name;
  }, [entities, entry?.tenantPreset?.sourceEntityName]);

  const previewDefinition = useMemo(
    () => (previewEntityName ? getDefinition(previewEntityName) : undefined),
    [getDefinition, previewEntityName],
  );

  const previewLayout = useMemo(() => {
    if (!entry || !previewDefinition) {
      return null;
    }
    return resolvePresetPreviewLayout(entry, previewDefinition);
  }, [entry, previewDefinition]);

  const previewStrategy = useMemo(
    () =>
      entry && previewDefinition
        ? resolvePreviewStrategy(resolvePresetPreviewSurface(entry))
        : resolvePreviewStrategy("listItem"),
    [entry, previewDefinition],
  );

  const previewContext = useMemo(() => {
    if (!previewDefinition) {
      return null;
    }
    return createEntityLayoutRenderContext({
      item: {},
      definition: previewDefinition,
      locale: i18n.language,
      usePreviewPlaceholder: true,
      usePreviewSamples: true,
      listFilters: {},
      routeParams: {},
      catalogItems: entities,
      getDefinition,
      t,
    });
  }, [entities, getDefinition, i18n.language, previewDefinition, t]);

  const editableLayout = useMemo(
    () => (previewLayout ? toEditableLayoutDocument(previewLayout) : null),
    [previewLayout],
  );

  if (!entry) {
    return (
      <div
        className={`${designerPreviewPanelShellClassName} ${designerPreviewPanelShellFillClassName}`}
      >
        <Text className="text-muted-foreground text-sm">
          {t("designLayout.presets.selectHint")}
        </Text>
      </div>
    );
  }

  async function handleSave() {
    const error = await editor.saveSelectedPreset();
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("designLayout.presets.saved"));
  }

  return (
    <div
      className={`${designerPreviewPanelShellClassName} ${designerPreviewPanelShellFillClassName} gap-4`}
    >
      <div className={designerPreviewPanelHeaderClassName}>
        <div className="min-w-0 space-y-1">
          <Text className="text-foreground text-base font-semibold">
            {entry.name}
          </Text>
          {entry.description ? (
            <Text className="text-muted-foreground text-sm">
              {entry.description}
            </Text>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <PresetListBadge source={entry.source} />
            <Text className="text-muted-foreground text-xs">
              {t(`designLayout.presets.kind.${entry.kind}`)}
              {entry.designSurface ? ` · ${entry.designSurface}` : ""}
            </Text>
            {isPlatform ? (
              <Text className="text-muted-foreground text-xs">
                · {t("designLayout.presets.list.platformReadOnly")}
              </Text>
            ) : null}
          </div>
        </div>
        {!readOnly ? (
          <Button
            type="button"
            loading={editor.isSaving}
            disabled={!editor.isDirty}
            onClick={() => void handleSave()}
          >
            {t("designLayout.presets.save")}
          </Button>
        ) : null}
      </div>

      <div
        className={`${designerPreviewPanelBodyFillClassName} min-h-[240px] overflow-hidden rounded-lg border`}
      >
        {!previewDefinition || !editableLayout || !previewContext ? (
          <div className="flex h-full items-center justify-center p-4">
            <Text className="text-muted-foreground text-sm">
              {t("designLayout.presets.list.previewUnavailable")}
            </Text>
          </div>
        ) : (
          <UnifiedDesignerPreviewPanel
            strategy={previewStrategy}
            colorScheme={colorScheme}
            fillHeight
            previewBody={
              <RecursiveLayoutRenderer
                layout={editableLayout}
                context={previewContext}
              />
            }
          />
        )}
      </div>

      {previewEntityName && previewDefinition ? (
        <Text className="text-muted-foreground text-xs">
          {t("designLayout.presets.list.previewEntity", {
            entity: getEntityLabel(previewDefinition),
          })}
        </Text>
      ) : null}

      {!isPlatform && draft ? (
        <div className="grid gap-3 border-t pt-4">
          <label className="flex flex-col gap-1 text-sm">
            <span>{t("designLayout.presets.name")}</span>
            <Input
              value={draft.name}
              disabled={readOnly}
              onChange={(event) =>
                editor.updateDraft({ name: event.target.value })
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t("designLayout.presets.descriptionField")}</span>
            <Input
              value={draft.description}
              disabled={readOnly}
              onChange={(event) =>
                editor.updateDraft({ description: event.target.value })
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t("designLayout.presets.list.kindLabel")}</span>
            <Select
              value={draft.kind}
              disabled={readOnly}
              onChange={(event) =>
                editor.updateDraft({
                  kind: event.target.value as (typeof PRESET_KINDS)[number],
                })
              }
            >
              {PRESET_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {t(`designLayout.presets.kind.${kind}`)}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t("designLayout.presets.templateJson")}</span>
            <textarea
              className="border-input bg-background min-h-[180px] w-full rounded-md border px-3 py-2 font-mono text-sm"
              value={draft.templateJson}
              disabled={readOnly}
              onChange={(event) =>
                editor.updateDraft({ templateJson: event.target.value })
              }
              spellCheck={false}
            />
          </label>
          {entry.fieldSlotCount > 0 ? (
            <Text className="text-muted-foreground text-sm">
              {t("designLayout.presets.fieldSlotsTitle")}:{" "}
              {entry.fieldSlotCount}
            </Text>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
