import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import {
  Button,
  SegmentedSwitch,
  toast,
  type SegmentedSwitchOption,
} from "@repo/ui";
import { buildInitialValues } from "@repo/ui-builder";

import type { EntityName } from "../../entities/entity-catalog";
import { EntityCardLayoutBuilder } from "./EntityCardLayoutBuilder";
import { DesignLayoutEditorShell } from "./DesignLayoutEditorShell";
import {
  useEntityUiOverrideEditor,
  type UseEntityUiOverrideEditorResult,
} from "./use-entity-ui-override-editor";
import { createEntityFormRenderContext } from "./create-entity-form-render-context";

interface EntityFormLayoutDesignEditorProps {
  readonly entityName: EntityName;
  readonly canSave?: boolean;
}

export function EntityFormLayoutDesignEditor({
  entityName,
  canSave = false,
}: EntityFormLayoutDesignEditorProps) {
  const { t, i18n } = useTranslation("common");
  const [formTab, setFormTab] = useState<"create" | "edit">("create");
  const createEditor = useEntityUiOverrideEditor(entityName, "forms.create");
  const editEditor = useEntityUiOverrideEditor(entityName, "forms.edit");
  const editor: UseEntityUiOverrideEditorResult =
    formTab === "create" ? createEditor : editEditor;

  const [values, setValues] = useState(() =>
    buildInitialValues(editor.definition, formTab),
  );

  const tabOptions = useMemo(
    (): readonly SegmentedSwitchOption<"create" | "edit">[] => [
      {
        value: "create",
        label: t("entity.create"),
        ariaLabel: t("entity.create"),
      },
      {
        value: "edit",
        label: t("entity.edit"),
        ariaLabel: t("entity.edit"),
      },
    ],
    [t],
  );

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

  const preview = (
    <div className="bg-card border-border rounded-lg border p-4">
      <RecursiveLayoutRenderer
        layout={editor.layout}
        context={createEntityFormRenderContext({
          entityName,
          definition: editor.definition,
          locale: i18n.language,
          mode: formTab,
          values,
          errors: {},
          fieldAccess: {},
          canRead: true,
          canWrite: true,
          onChange: (name, value) =>
            setValues((current) => ({ ...current, [name]: value })),
          onCancel: () => undefined,
          hideActions: true,
          cancelLabel: t("entity.cancel"),
          saveLabel: t("entity.save"),
        })}
      />
    </div>
  );

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    const ok = await editor.save();
    if (ok) {
      toast.success(t("entity.viewSettings.saved"));
    } else {
      toast.error(t("entity.viewSettings.saveFailed"));
    }
  };

  return (
    <DesignLayoutEditorShell preview={preview}>
      {canSave ? (
        <div className="flex justify-end">
          <Button
            type="button"
            loading={editor.isSaving}
            onClick={() => void handleSave()}
          >
            {t("entity.viewSettings.save")}
          </Button>
        </div>
      ) : null}
      <SegmentedSwitch
        value={formTab}
        options={tabOptions}
        onChange={(value) => {
          setFormTab(value);
          setValues(buildInitialValues(editor.definition, value));
        }}
        ariaLabel={t("designLayout.formMode")}
      />
      <EntityCardLayoutBuilder
        key={`${formTab}-${editor.layoutEditorKey}`}
        layout={editor.layout}
        definition={editor.definition}
        defaultFieldPath={editor.defaultFieldPath}
        onLayoutChange={editor.setLayout}
        labels={structureLabels}
        designSurface={formTab === "create" ? "formCreate" : "formEdit"}
      />
    </DesignLayoutEditorShell>
  );
}
