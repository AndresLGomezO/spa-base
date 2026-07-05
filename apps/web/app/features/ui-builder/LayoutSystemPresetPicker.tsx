import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  applyPresetSlots,
  type DesignSurface,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import type { UiBuilderPresetRecord } from "@repo/entities";
import { Button, Modal, Select, Text } from "@repo/ui";

import { entityCardViewAdapter } from "@repo/ui-builder-react";
import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import type { EntityName } from "../../entities/entity-catalog";
import {
  builtinPresetDescription,
  builtinPresetLabel,
  layoutSystemPresetLabels,
} from "./layout-system-preset-labels";
import {
  useLayoutSystemPresetCatalog,
  type LayoutPresetId,
  type LayoutSystemPresetSelection,
} from "./use-layout-system-preset-catalog";
import { useUiBuilderPresetStore } from "./use-ui-builder-preset-store";

interface LayoutSystemPresetPickerProps {
  readonly entityName: EntityName;
  readonly surfaces: readonly DesignSurface[];
  readonly fieldPaths: readonly string[];
  readonly value: LayoutPresetId;
  readonly canApply: boolean;
  readonly confirmOnReplace?: boolean;
  readonly onApplyBuiltin: (
    selection: Extract<LayoutSystemPresetSelection, { source: "builtin" }>,
  ) => void;
  readonly onApplyTenant: (
    preset: UiBuilderPresetRecord,
    layout: UiLayoutDocument,
  ) => void;
}

export function LayoutSystemPresetPicker({
  entityName,
  surfaces,
  fieldPaths,
  value,
  canApply,
  confirmOnReplace = false,
  onApplyBuiltin,
  onApplyTenant,
}: LayoutSystemPresetPickerProps) {
  const { t } = useTranslation("common");
  const labels = useMemo(() => layoutSystemPresetLabels(t), [t]);
  const { presets, canApplyPresets } = useUiBuilderPresetStore(entityName);
  const { getDefinition, items } = useEntityCatalog();
  const definition = useEntityDefinition(entityName);
  const fieldDescriptors = useMemo(
    () =>
      entityCardViewAdapter(definition, getDefinition, items).fieldDescriptors,
    [definition, getDefinition, items],
  );

  const { entries, platformEntries, tenantEntries } =
    useLayoutSystemPresetCatalog({
      surfaces,
      fieldPaths,
      tenantPresets: presets,
      builtinLabel: (id) => builtinPresetLabel(t, id),
      builtinDescription: (id) => builtinPresetDescription(t, id),
    });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [pendingSelection, setPendingSelection] =
    useState<LayoutSystemPresetSelection | null>(null);
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});

  const pendingTenantPreset = useMemo(() => {
    if (!pendingSelection || pendingSelection.source !== "tenant") {
      return null;
    }
    return (
      tenantEntries.find((entry) => entry.selection.id === pendingSelection.id)
        ?.tenantPreset ?? null
    );
  }, [pendingSelection, tenantEntries]);

  useEffect(() => {
    if (!pendingTenantPreset) {
      setSlotValues({});
      return;
    }
    const next: Record<string, string> = {};
    for (const slot of pendingTenantPreset.fieldSlots) {
      next[slot.id] = slot.sourceHint ?? fieldDescriptors[0]?.path ?? "";
    }
    setSlotValues(next);
  }, [fieldDescriptors, pendingTenantPreset]);

  const tenantValidation = useMemo(() => {
    if (!pendingTenantPreset) {
      return null;
    }
    const designSurface =
      pendingTenantPreset.designSurface ?? surfaces[0] ?? "listItem";
    return applyPresetSlots(
      pendingTenantPreset.kind,
      pendingTenantPreset.templateJson,
      pendingTenantPreset.fieldSlots,
      slotValues,
      { designSurface, definition, actionsInModalFooter: false },
    );
  }, [definition, pendingTenantPreset, slotValues, surfaces]);

  const selectedLabel = useMemo(() => {
    if (value === "custom") {
      return labels.custom;
    }
    const match = entries.find((entry) => entry.value === value);
    return match?.label ?? labels.custom;
  }, [entries, labels.custom, value]);

  const applySelection = useCallback(
    (selection: LayoutSystemPresetSelection) => {
      if (selection.source === "builtin") {
        onApplyBuiltin(selection);
        return;
      }

      const preset = tenantEntries.find(
        (entry) => entry.selection.id === selection.id,
      )?.tenantPreset;
      if (!preset) {
        return;
      }

      if (preset.fieldSlots.length > 0) {
        setPendingSelection(selection);
        setTenantDialogOpen(true);
        return;
      }

      const designSurface = preset.designSurface ?? surfaces[0] ?? "listItem";
      const result = applyPresetSlots(
        preset.kind,
        preset.templateJson,
        preset.fieldSlots,
        {},
        { designSurface, definition, actionsInModalFooter: false },
      );
      if (result.ok && result.data && "root" in result.data) {
        onApplyTenant(preset, result.data);
      }
    },
    [definition, onApplyBuiltin, onApplyTenant, surfaces, tenantEntries],
  );

  const handleSelectChange = useCallback(
    (nextValue: string) => {
      if (!canApply || !canApplyPresets || !nextValue) {
        return;
      }

      const entry = entries.find((item) => item.value === nextValue);
      if (!entry || entry.value === value) {
        return;
      }

      if (confirmOnReplace) {
        setPendingSelection(entry.selection);
        setConfirmOpen(true);
        return;
      }

      applySelection(entry.selection);
    },
    [
      applySelection,
      canApply,
      canApplyPresets,
      confirmOnReplace,
      entries,
      value,
    ],
  );

  const handleConfirmApply = useCallback(() => {
    if (!pendingSelection) {
      setConfirmOpen(false);
      return;
    }
    applySelection(pendingSelection);
    setPendingSelection(null);
    setConfirmOpen(false);
  }, [applySelection, pendingSelection]);

  const handleTenantApply = useCallback(() => {
    if (
      !pendingTenantPreset ||
      !tenantValidation?.ok ||
      !tenantValidation.data ||
      !("root" in tenantValidation.data)
    ) {
      return;
    }
    onApplyTenant(pendingTenantPreset, tenantValidation.data);
    setTenantDialogOpen(false);
    setPendingSelection(null);
  }, [onApplyTenant, pendingTenantPreset, tenantValidation]);

  const effectiveCanApply = canApply && canApplyPresets;

  return (
    <>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-muted-foreground text-sm">{labels.label}</span>
        {!effectiveCanApply ? (
          <Text className="text-muted-foreground text-sm">
            {labels.readOnlyHint}
          </Text>
        ) : null}
        <Select
          className="border-input bg-background max-w-md rounded-md border px-3 py-2 text-sm"
          value={value === "custom" ? "" : value}
          disabled={!effectiveCanApply || entries.length === 0}
          onChange={(event) => handleSelectChange(event.target.value)}
          aria-label={labels.selectPreset}
        >
          {value === "custom" ? (
            <option value="">{selectedLabel}</option>
          ) : null}
          {platformEntries.length > 0 ? (
            <optgroup label={labels.platformGroup}>
              {platformEntries.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                  {entry.isDefault
                    ? ` (${t("designLayout.systemPresets.default")})`
                    : ""}
                </option>
              ))}
            </optgroup>
          ) : null}
          {tenantEntries.length > 0 ? (
            <optgroup label={labels.tenantGroup}>
              {tenantEntries.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </optgroup>
          ) : null}
        </Select>
        {value !== "custom" ? (
          <span className="text-muted-foreground text-xs">{selectedLabel}</span>
        ) : null}
        {entries.length === 0 ? (
          <Text className="text-muted-foreground text-xs">
            {labels.noPresets}
          </Text>
        ) : null}
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setPendingSelection(null);
        }}
        title={labels.confirmTitle}
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmOpen(false);
                setPendingSelection(null);
              }}
            >
              {labels.cancel}
            </Button>
            <Button type="button" onClick={handleConfirmApply}>
              {labels.confirmApply}
            </Button>
          </>
        }
      >
        <Text className="text-sm">{labels.confirmBody}</Text>
      </Modal>

      <Modal
        open={tenantDialogOpen}
        onClose={() => {
          setTenantDialogOpen(false);
          setPendingSelection(null);
        }}
        title={labels.tenantPresetTitle}
        size="lg"
        scrollable
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTenantDialogOpen(false);
                setPendingSelection(null);
              }}
            >
              {labels.cancel}
            </Button>
            <Button
              type="button"
              disabled={!tenantValidation?.ok}
              onClick={handleTenantApply}
            >
              {labels.apply}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {pendingTenantPreset?.fieldSlots.map((slot) => (
            <label key={slot.id} className="flex flex-col gap-1 text-sm">
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

          {tenantValidation && !tenantValidation.ok ? (
            <div className="flex flex-col gap-2">
              <Text className="text-destructive text-sm">{labels.invalid}</Text>
              <ul className="text-destructive list-disc pl-5 text-sm">
                {tenantValidation.errors.map((error) => (
                  <li key={`${error.path}:${error.message}`}>
                    {error.path}: {error.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
