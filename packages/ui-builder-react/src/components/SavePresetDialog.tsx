import { useMemo, useState } from "react";
import type {
  ColumnNode,
  ComponentRowNode,
  DesignSurface,
  NestedLayoutRowNode,
  UiBuilderPresetKind,
  UiLayoutDocument,
} from "@repo/ui-builder-core";
import {
  genericizeLayoutNode,
  GenericizeLayoutNodeError,
} from "@repo/ui-builder-core";
import type { CreateUiBuilderPresetInput } from "@repo/entities";
import { Button, Input, Modal, Text } from "@repo/ui";

export interface LayoutPresetLabels {
  readonly saveTrigger: string;
  readonly saveTitle: string;
  readonly name: string;
  readonly description: string;
  readonly save: string;
  readonly cancel: string;
  readonly saveFailed: string;
  readonly readOnlyHint: string;
}

export interface SavePresetDialogProps {
  readonly kind: UiBuilderPresetKind;
  readonly node:
    | UiLayoutDocument
    | ColumnNode
    | ComponentRowNode
    | NestedLayoutRowNode;
  readonly designSurface?: DesignSurface;
  readonly sourceEntityName?: string;
  readonly canSave: boolean;
  readonly labels: LayoutPresetLabels;
  readonly onSave: (input: CreateUiBuilderPresetInput) => Promise<void>;
  readonly triggerSize?: "sm" | "md" | "lg";
}

export function SavePresetDialog({
  kind,
  node,
  designSurface,
  sourceEntityName,
  canSave,
  labels,
  onSave,
  triggerSize = "sm",
}: SavePresetDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const genericized = useMemo(() => {
    try {
      return genericizeLayoutNode(kind, node);
    } catch {
      return null;
    }
  }, [kind, node]);

  const handleSave = async () => {
    if (!canSave || !genericized || name.trim().length === 0) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        description:
          description.trim().length > 0 ? description.trim() : undefined,
        kind,
        designSurface,
        sourceEntityName,
        templateJson: JSON.stringify(genericized.template),
        fieldSlots: [...genericized.fieldSlots],
      });
      setOpen(false);
      setName("");
      setDescription("");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : labels.saveFailed,
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={triggerSize}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {labels.saveTrigger}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={labels.saveTitle}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {labels.cancel}
            </Button>
            <Button
              type="button"
              disabled={!canSave || !genericized || name.trim().length === 0}
              loading={isSaving}
              onClick={() => void handleSave()}
            >
              {labels.save}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {!canSave ? (
            <Text className="text-muted-foreground text-sm">
              {labels.readOnlyHint}
            </Text>
          ) : null}
          {!genericized ? (
            <Text className="text-destructive text-sm">
              {GenericizeLayoutNodeError.name}:{" "}
              {(() => {
                try {
                  genericizeLayoutNode(kind, node);
                  return "";
                } catch (genericizeError) {
                  return genericizeError instanceof Error
                    ? genericizeError.message
                    : labels.saveFailed;
                }
              })()}
            </Text>
          ) : null}
          <label className="flex flex-col gap-1 text-sm">
            <span>{labels.name}</span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{labels.description}</span>
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          {error ? (
            <Text className="text-destructive text-sm">{error}</Text>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
