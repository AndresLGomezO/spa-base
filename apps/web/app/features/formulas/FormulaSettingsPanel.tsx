import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CollapsibleEditorCard } from "@repo/ui-builder-react";
import { Button, FieldLabel, Select, Text, toast } from "@repo/ui";

import { ExpressionEditor } from "../data-hooks/ExpressionEditor";
import {
  designerPreviewPanelBodyFillClassName,
  designerPreviewPanelHeaderClassName,
  designerPreviewPanelShellClassName,
  designerPreviewPanelShellFillClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { FormulaExpressionPreview } from "./FormulaExpressionPreview";
import { useFormulas } from "./formulas-context";
import { FormulaDefinitionJsonToolbar } from "./json/FormulaDefinitionJsonToolbar";
import { formulaDefinitionFormJsonLabels } from "./json/formula-definition-json-labels";

const controlClassName =
  "border-input bg-background flex h-9 w-full rounded-md border px-3 py-1.5 text-sm";

export function FormulaSettingsPanel() {
  const { t } = useTranslation("common");
  const { editor, canUpdate } = useFormulas();
  const jsonLabels = useMemo(() => formulaDefinitionFormJsonLabels(t), [t]);

  const definition = editor.selectedDefinition;
  const draft = editor.draft;
  const isPlatform = definition?.source === "platform";
  const readOnly = !canUpdate || isPlatform;

  if (!definition || !draft) {
    return (
      <div
        className={`${designerPreviewPanelShellClassName} ${designerPreviewPanelShellFillClassName}`}
      >
        <Text className="text-muted-foreground text-sm">
          {t("formulas.settings.empty")}
        </Text>
      </div>
    );
  }

  async function handleSave() {
    const error = await editor.saveSelectedFormula();
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("formulas.settings.saved"));
  }

  return (
    <div
      className={`${designerPreviewPanelShellClassName} ${designerPreviewPanelShellFillClassName}`}
    >
      <div className={designerPreviewPanelHeaderClassName}>
        <div className="min-w-0">
          <Text className="text-foreground text-base font-semibold">
            {definition.name}
          </Text>
          {(draft.description || definition.description) ? (
            <Text className="text-muted-foreground text-sm">
              {draft.description || definition.description}
            </Text>
          ) : null}
          <Text className="text-muted-foreground text-xs">
            {definition.source}
            {isPlatform ? ` · ${t("formulas.settings.platformReadOnly")}` : ""}
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FormulaDefinitionJsonToolbar
            existingName={definition.name}
            canApply={canUpdate && !isPlatform}
            formData={{
              name: draft.name,
              description: draft.description.trim() || undefined,
              inputs: definition.inputs.map((input) => ({
                name: input.name,
                required: input.required ?? false,
                ...(input.description !== undefined
                  ? { description: input.description }
                  : {}),
              })),
              body: draft.body,
              enabled: draft.enabled,
            }}
            labels={jsonLabels}
            onImport={(data) =>
              editor.updateDraft({
                name: data.name,
                description: data.description ?? "",
                enabled: data.enabled ?? true,
                body: data.body,
              })
            }
          />
          <Button
            type="button"
            loading={editor.isSaving}
            disabled={readOnly || !editor.isDirty}
            onClick={() => void handleSave()}
          >
            {t("formulas.settings.save")}
          </Button>
        </div>
      </div>

      <div className={designerPreviewPanelBodyFillClassName}>
        <div className="space-y-4">
          <CollapsibleEditorCard
            title={t("formulas.settings.sections.metadata")}
            defaultOpen
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <FieldLabel htmlFor="formula-settings-name">
                  {t("formulas.fields.name")}
                </FieldLabel>
                <input
                  id="formula-settings-name"
                  className={controlClassName}
                  value={draft.name}
                  disabled={readOnly}
                  onChange={(event) =>
                    editor.updateDraft({ name: event.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <FieldLabel>{t("formulas.settings.status")}</FieldLabel>
                <Select
                  className={controlClassName}
                  value={draft.enabled ? "enabled" : "disabled"}
                  disabled={readOnly}
                  onChange={(event) =>
                    editor.updateDraft({
                      enabled: event.target.value === "enabled",
                    })
                  }
                >
                  <option value="enabled">
                    {t("formulas.settings.enabled")}
                  </option>
                  <option value="disabled">
                    {t("formulas.settings.disabled")}
                  </option>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <FieldLabel htmlFor="formula-settings-description">
                {t("formulas.fields.description")}
              </FieldLabel>
              <input
                id="formula-settings-description"
                className={controlClassName}
                value={draft.description}
                disabled={readOnly}
                onChange={(event) =>
                  editor.updateDraft({ description: event.target.value })
                }
              />
            </div>
          </CollapsibleEditorCard>

          <CollapsibleEditorCard
            title={t("formulas.settings.sections.preview")}
            defaultOpen
          >
            <FormulaExpressionPreview value={draft.body} showTitle={false} />
          </CollapsibleEditorCard>

          <CollapsibleEditorCard
            title={t("formulas.settings.sections.body")}
            defaultOpen
          >
            <ExpressionEditor
              value={draft.body}
              showPreview={false}
              collapsibleNested
              readOnly={readOnly}
              onChange={(body) => editor.updateDraft({ body })}
            />
          </CollapsibleEditorCard>
        </div>
      </div>
    </div>
  );
}
