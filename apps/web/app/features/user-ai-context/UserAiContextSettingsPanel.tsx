import { useTranslation } from "react-i18next";
import { CollapsibleEditorCard } from "@repo/ui-builder-react";
import { Button, FieldLabel, Input, Text, toast } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import type { AiContextSectionBlock } from "@repo/ai-context/storage";

import {
  designerPreviewPanelBodyFillClassName,
  designerPreviewPanelHeaderClassName,
  designerPreviewPanelShellClassName,
  designerPreviewPanelShellFillClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import {
  createDefaultBlock,
  UserAiContextBlockEditor,
} from "./blocks/UserAiContextBlockEditor";
import { useUserAiContext } from "./user-ai-context-context";

const controlClassName =
  "border-input bg-background flex h-9 w-full rounded-md border px-3 py-1.5 text-sm";

export function UserAiContextSettingsPanel() {
  const { t } = useTranslation("common");
  const { editor, canUpdate } = useUserAiContext();
  const definition = editor.selectedDefinition;
  const draft = editor.draft;
  const readOnly = !canUpdate;

  if (!definition || !draft) {
    return (
      <div
        className={`${designerPreviewPanelShellClassName} ${designerPreviewPanelShellFillClassName}`}
      >
        <Text className="text-muted-foreground text-sm">
          {t("userAiContext.settings.empty")}
        </Text>
      </div>
    );
  }

  const currentDraft = draft;

  async function handleSave() {
    const error = await editor.saveSelected();
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("userAiContext.settings.saved"));
  }

  function updateBlock(index: number, next: AiContextSectionBlock) {
    const blocks = [...currentDraft.blocks];
    blocks[index] = next;
    editor.updateDraft({ blocks });
  }

  function removeBlock(index: number) {
    editor.updateDraft({
      blocks: currentDraft.blocks.filter((_, i) => i !== index),
    });
  }

  function moveBlock(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= currentDraft.blocks.length) return;
    const blocks = [...currentDraft.blocks];
    const [item] = blocks.splice(index, 1);
    if (!item) return;
    blocks.splice(target, 0, item);
    editor.updateDraft({ blocks });
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
          {draft.description ? (
            <Text className="text-muted-foreground text-sm">
              {draft.description}
            </Text>
          ) : null}
        </div>
        <Button
          type="button"
          loading={editor.isSaving}
          disabled={readOnly || !editor.isDirty}
          onClick={() => void handleSave()}
        >
          {t("userAiContext.settings.save")}
        </Button>
      </div>

      <div className={designerPreviewPanelBodyFillClassName}>
        <div className="space-y-4">
          <CollapsibleEditorCard
            title={t("userAiContext.settings.sections.metadata")}
            defaultOpen
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <FieldLabel htmlFor="uai-settings-name">
                  {t("userAiContext.fields.name")}
                </FieldLabel>
                <Input
                  id="uai-settings-name"
                  className={controlClassName}
                  disabled={readOnly}
                  value={draft.name}
                  onChange={(event) =>
                    editor.updateDraft({ name: event.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="uai-settings-order">
                  {t("userAiContext.fields.order")}
                </FieldLabel>
                <Input
                  id="uai-settings-order"
                  type="number"
                  className={controlClassName}
                  disabled={readOnly}
                  value={draft.order}
                  onChange={(event) =>
                    editor.updateDraft({
                      order: Number.parseInt(event.target.value, 10) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <FieldLabel>{t("userAiContext.fields.scope")}</FieldLabel>
                <Select
                  className={controlClassName}
                  disabled={readOnly}
                  value={draft.scope}
                  onChange={(event) =>
                    editor.updateDraft({
                      scope: event.target.value as "tenantWide" | "perUser",
                    })
                  }
                >
                  <option value="perUser">
                    {t("userAiContext.scopes.perUser")}
                  </option>
                  <option value="tenantWide">
                    {t("userAiContext.scopes.tenantWide")}
                  </option>
                </Select>
              </div>
              <div className="space-y-1">
                <FieldLabel>{t("userAiContext.fields.status")}</FieldLabel>
                <Select
                  className={controlClassName}
                  disabled={readOnly}
                  value={draft.enabled ? "enabled" : "disabled"}
                  onChange={(event) =>
                    editor.updateDraft({
                      enabled: event.target.value === "enabled",
                    })
                  }
                >
                  <option value="enabled">
                    {t("userAiContext.list.statusEnabled")}
                  </option>
                  <option value="disabled">
                    {t("userAiContext.list.statusDisabled")}
                  </option>
                </Select>
              </div>
            </div>
          </CollapsibleEditorCard>

          <CollapsibleEditorCard
            title={t("userAiContext.settings.sections.blocks")}
            defaultOpen
          >
            <div className="space-y-3">
              {draft.blocks.map((block, index) => (
                <UserAiContextBlockEditor
                  key={`${block.kind}-${index}`}
                  block={block}
                  index={index}
                  disabled={readOnly}
                  onChange={(next) => updateBlock(index, next)}
                  onRemove={() => removeBlock(index)}
                  onMoveUp={index > 0 ? () => moveBlock(index, -1) : undefined}
                  onMoveDown={
                    index < draft.blocks.length - 1
                      ? () => moveBlock(index, 1)
                      : undefined
                  }
                />
              ))}
              <Button
                type="button"
                variant="outline"
                disabled={readOnly}
                onClick={() =>
                  editor.updateDraft({
                    blocks: [
                      ...draft.blocks,
                      createDefaultBlock("staticMarkdown"),
                    ],
                  })
                }
              >
                {t("userAiContext.blocks.add")}
              </Button>
            </div>
          </CollapsibleEditorCard>
        </div>
      </div>
    </div>
  );
}
