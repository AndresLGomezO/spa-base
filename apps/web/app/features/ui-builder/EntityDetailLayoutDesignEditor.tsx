import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import { Input, Text } from "@repo/ui";

import type { EntityName } from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { CollapsibleSection } from "../../components/CollapsibleSection";
import { useEntity } from "../../hooks/useEntity";
import { EntityCardLayoutBuilder } from "./EntityCardLayoutBuilder";
import { DesignLayoutEditorShell } from "./DesignLayoutEditorShell";
import {
  useEntityUiOverrideEditor,
  type UseEntityUiOverrideEditorResult,
} from "./use-entity-ui-override-editor";
import { createEntityRecordRenderContext } from "./create-entity-record-render-context";

interface EntityDetailLayoutDesignEditorProps {
  readonly entityName: EntityName;
  readonly editor?: UseEntityUiOverrideEditorResult;
}

export function EntityDetailLayoutDesignEditor({
  entityName,
  editor: editorProp,
}: EntityDetailLayoutDesignEditorProps) {
  const { t, i18n } = useTranslation("common");
  const internalEditor = useEntityUiOverrideEditor(entityName, "detail");
  const editor = editorProp ?? internalEditor;
  const { getDefinition, items: catalogItems } = useEntityCatalog();
  const { items } = useEntity(entityName, { page: 1 });
  const [previewRecordId, setPreviewRecordId] = useState("");

  const previewRecord = useMemo(() => {
    if (previewRecordId) {
      const match = items.find(
        (item) => String((item as Record<string, unknown>).id) === previewRecordId,
      );
      if (match) {
        return match as Record<string, unknown>;
      }
    }
    return items[0] as Record<string, unknown> | undefined;
  }, [items, previewRecordId]);

  const structureLabels = useMemo(
    () => ({
      structure: t("entity.viewSettings.structure"),
      layoutColumns: t("entity.viewSettings.layoutColumns"),
      showActions: t("entity.viewSettings.showActions"),
      columnStyles: t("entity.viewSettings.columnStyles"),
      stackDirection: {
        title: t("entity.viewSettings.stackDirection"),
        vertical: t("entity.viewSettings.stackVertical"),
        horizontal: t("entity.viewSettings.stackHorizontal"),
      },
      styleRules: {
        addStyleRule: t("entity.viewSettings.addStyleRule"),
        removeStyleRule: t("entity.viewSettings.removeStyleRule"),
        styleProperty: t("entity.viewSettings.styleProperty"),
        styleValue: t("entity.viewSettings.styleValue"),
      },
      columnTab: (column: number) =>
        t("entity.viewSettings.columnTab", { column }),
      moveColumnLeft: t("entity.viewSettings.moveColumnLeft"),
      moveColumnRight: t("entity.viewSettings.moveColumnRight"),
      deleteColumn: (column: number) =>
        t("entity.viewSettings.deleteColumn", { column }),
      addRow: t("entity.viewSettings.addSlot"),
      componentRow: t("entity.viewSettings.component"),
      nestedRow: t("entity.viewSettings.slotColumns"),
      emptyColumn: t("entity.viewSettings.emptyColumn"),
      moveUp: t("entity.viewSettings.moveSlotUp"),
      moveDown: t("entity.viewSettings.moveSlotDown"),
      deleteRow: t("entity.viewSettings.deleteSlot"),
      componentEditor: {
        component: t("entity.viewSettings.component"),
        staticValue: t("entity.viewSettings.staticValue"),
        field: t("entity.viewSettings.field"),
        fallbacks: t("entity.viewSettings.fallbacks"),
        remove: t("entity.viewSettings.remove"),
        addFallback: t("entity.viewSettings.addFallback"),
        slotSettings: t("entity.viewSettings.slotSettings"),
        componentStyles: t("entity.viewSettings.componentStyles"),
        badgeColorRules: t("entity.viewSettings.badgeColorRules"),
        matchValue: t("entity.viewSettings.matchValue"),
        addRule: t("entity.viewSettings.addRule"),
        imageSize: t("entity.viewSettings.imageSize"),
        dateDisplayFormat: t("entity.viewSettings.dateDisplayFormat"),
        displayFormat: t("entity.viewSettings.displayFormat"),
        showCurrency: t("entity.viewSettings.showCurrency"),
        showToneColors: t("entity.viewSettings.showToneColors"),
        styleRules: {
          addStyleRule: t("entity.viewSettings.addStyleRule"),
          removeStyleRule: t("entity.viewSettings.removeStyleRule"),
          styleProperty: t("entity.viewSettings.styleProperty"),
          styleValue: t("entity.viewSettings.styleValue"),
        },
        label: {
          showLabel: t("entity.viewSettings.showLabel"),
          label: t("entity.viewSettings.label"),
          labelPosition: t("entity.viewSettings.labelPosition"),
          labelAbove: t("entity.viewSettings.labelAbove"),
          labelBelow: t("entity.viewSettings.labelBelow"),
          labelAlignLeft: t("entity.viewSettings.labelAlignLeft"),
          labelAlignCenter: t("entity.viewSettings.labelAlignCenter"),
          labelAlignRight: t("entity.viewSettings.labelAlignRight"),
          labelColor: t("entity.viewSettings.labelColor"),
        },
      },
    }),
    [t],
  );

  const preview = previewRecord ? (
    <div className="bg-card border-border rounded-lg border p-4">
      <Text className="text-muted-foreground mb-3 text-sm">
        {t("entity.viewSettings.preview")}
      </Text>
      <RecursiveLayoutRenderer
        layout={editor.layout}
        context={createEntityRecordRenderContext({
          item: previewRecord,
          definition: editor.definition,
          locale: i18n.language,
          usePreviewSamples: true,
          getDefinition,
        })}
      />
    </div>
  ) : null;

  return (
    <DesignLayoutEditorShell preview={preview}>
      <CollapsibleSection title={t("designLayout.previewRecord")} defaultOpen>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">
            {t("designLayout.previewRecordId")}
          </span>
          <Input
            value={previewRecordId}
            onChange={(event) => setPreviewRecordId(event.target.value)}
            placeholder={
              previewRecord?.id != null ? String(previewRecord.id) : ""
            }
          />
        </label>
      </CollapsibleSection>
      <EntityCardLayoutBuilder
        key={editor.layoutEditorKey}
        layout={editor.layout}
        definition={editor.definition}
        defaultFieldPath={editor.defaultFieldPath}
        onLayoutChange={editor.setLayout}
        labels={structureLabels}
        designSurface="detail"
        getDefinition={getDefinition}
      />
    </DesignLayoutEditorShell>
  );
}

export type { UseEntityUiOverrideEditorResult };
