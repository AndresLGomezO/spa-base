import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  applyPresetSlots,
  type ColumnNode,
  type ComponentRowNode,
  type DesignSurface,
  type NestedLayoutRowNode,
  type UiBuilderPresetKind,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import type { UiBuilderPresetRecord } from "@repo/entities";
import type { FieldPathValidationDefinition } from "@repo/ui-builder-core";
import { Button, Modal, Text, Select } from "@repo/ui";

import type { FieldDescriptor } from "../adapters/entity-card-view-adapter.js";

export interface LayoutPresetInsertLabels {
  readonly insertTrigger: string;
  readonly insertTitle: string;
  readonly selectPreset: string;
  readonly mapFields: string;
  readonly apply: string;
  readonly cancel: string;
  readonly invalid: string;
  readonly readOnlyHint: string;
  readonly noPresets: string;
  readonly slotLabel: string;
}

export interface InsertPresetDialogProps {
  readonly kind: UiBuilderPresetKind;
  readonly designSurface: DesignSurface;
  readonly definition: FieldPathValidationDefinition;
  readonly fieldDescriptors: readonly FieldDescriptor[];
  readonly presets: readonly UiBuilderPresetRecord[];
  readonly canApply: boolean;
  readonly labels: LayoutPresetInsertLabels;
  readonly onApply: (
    data:
      | UiLayoutDocument
      | ColumnNode
      | ComponentRowNode
      | NestedLayoutRowNode,
  ) => void;
  readonly actionsInModalFooter?: boolean;
  readonly triggerSize?: "sm" | "md" | "lg";
  readonly renderTrigger?: (options: { open: () => void }) => ReactNode;
}

export function InsertPresetDialog({
  kind,
  designSurface,
  definition,
  fieldDescriptors,
  presets,
  canApply,
  labels,
  onApply,
  actionsInModalFooter = false,
  triggerSize = "sm",
  renderTrigger,
}: InsertPresetDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});

  const compatiblePresets = useMemo(
    () =>
      presets.filter(
        (preset) =>
          preset.kind === kind &&
          (preset.designSurface === undefined ||
            preset.designSurface === designSurface),
      ),
    [designSurface, kind, presets],
  );

  const selectedPreset =
    compatiblePresets.find((preset) => preset.id === selectedPresetId) ?? null;

  useEffect(() => {
    if (!selectedPreset) {
      setSlotValues({});
      return;
    }
    const next: Record<string, string> = {};
    for (const slot of selectedPreset.fieldSlots) {
      next[slot.id] = slot.sourceHint ?? fieldDescriptors[0]?.path ?? "";
    }
    setSlotValues(next);
  }, [fieldDescriptors, selectedPreset]);

  const validation = useMemo(() => {
    if (!selectedPreset) {
      return null;
    }
    return applyPresetSlots(
      selectedPreset.kind,
      selectedPreset.templateJson,
      selectedPreset.fieldSlots,
      slotValues,
      { designSurface, definition, actionsInModalFooter },
    );
  }, [
    actionsInModalFooter,
    definition,
    designSurface,
    selectedPreset,
    slotValues,
  ]);

  const handleApply = () => {
    if (!canApply || !validation?.ok || !validation.data) {
      return;
    }
    onApply(validation.data);
    setOpen(false);
  };

  const openDialog = () => setOpen(true);

  return (
    <>
      {renderTrigger ? (
        renderTrigger({ open: openDialog })
      ) : (
        <Button
          type="button"
          variant="outline"
          size={triggerSize}
          onClick={openDialog}
        >
          {labels.insertTrigger}
        </Button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={labels.insertTitle}
        size="lg"
        scrollable
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
              disabled={!canApply || !validation?.ok}
              onClick={handleApply}
            >
              {labels.apply}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {!canApply ? (
            <Text className="text-muted-foreground text-sm">
              {labels.readOnlyHint}
            </Text>
          ) : null}

          {compatiblePresets.length === 0 ? (
            <Text className="text-muted-foreground text-sm">
              {labels.noPresets}
            </Text>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-sm">
                <span>{labels.selectPreset}</span>
                <Select
                  className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                  value={selectedPresetId}
                  onChange={(event) => setSelectedPresetId(event.target.value)}
                >
                  <option value="">—</option>
                  {compatiblePresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </Select>
              </label>

              {selectedPreset && selectedPreset.fieldSlots.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <Text className="text-sm font-medium">
                    {labels.mapFields}
                  </Text>
                  {selectedPreset.fieldSlots.map((slot) => (
                    <label
                      key={slot.id}
                      className="flex flex-col gap-1 text-sm"
                    >
                      <span>
                        {labels.slotLabel}: {slot.label ?? slot.id}
                        {slot.sourceHint ? ` (${slot.sourceHint})` : ""}
                      </span>
                      <Select
                        className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                        value={slotValues[slot.id] ?? ""}
                        onChange={(event) =>
                          setSlotValues((current) => ({
                            ...current,
                            [slot.id]: event.target.value,
                          }))
                        }
                      >
                        {fieldDescriptors.map((descriptor) => (
                          <option key={descriptor.path} value={descriptor.path}>
                            {descriptor.label}
                          </option>
                        ))}
                      </Select>
                    </label>
                  ))}
                </div>
              ) : null}

              {validation && !validation.ok ? (
                <div className="flex flex-col gap-2">
                  <Text className="text-destructive text-sm">
                    {labels.invalid}
                  </Text>
                  <ul className="text-destructive list-disc pl-5 text-sm">
                    {validation.errors.map((error) => (
                      <li key={`${error.path}:${error.message}`}>
                        {error.path}: {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
