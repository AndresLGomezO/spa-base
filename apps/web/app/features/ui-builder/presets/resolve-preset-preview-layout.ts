import {
  applyBuiltInTemplate,
  applyPresetSlots,
  BUILT_IN_TEMPLATE_DEFINITIONS,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import type { SerializableEntityDefinition } from "@repo/entities";

import type { PresetCatalogEntry } from "./preset-catalog-entry";

const DEFAULT_PREVIEW_FIELD_PATHS = ["name"] as const;

function resolveEntryPreviewSurface(entry: PresetCatalogEntry) {
  if (entry.designSurface) {
    return entry.designSurface;
  }

  if (entry.builtinId) {
    const definition = BUILT_IN_TEMPLATE_DEFINITIONS.find(
      (item) => item.id === entry.builtinId,
    );
    return definition?.surfaces[0] ?? "listItem";
  }

  return entry.tenantPreset?.designSurface ?? "listItem";
}

function getPreviewFieldPaths(
  definition: SerializableEntityDefinition,
): readonly string[] {
  const paths = Object.keys(definition.fields).filter(
    (field) => definition.fields[field]?.type !== "document",
  );
  return paths.length > 0 ? paths : DEFAULT_PREVIEW_FIELD_PATHS;
}

export function resolvePresetPreviewLayout(
  entry: PresetCatalogEntry,
  definition: SerializableEntityDefinition,
): UiLayoutDocument | null {
  const fieldPaths = getPreviewFieldPaths(definition);
  const designSurface = resolveEntryPreviewSurface(entry);

  if (entry.source === "platform" && entry.builtinId) {
    return applyBuiltInTemplate(entry.builtinId, { fieldPaths });
  }

  const preset = entry.tenantPreset;
  if (!preset) {
    return null;
  }

  if (preset.fieldSlots.length === 0) {
    try {
      const parsed = JSON.parse(preset.templateJson) as unknown;
      if (
        parsed &&
        typeof parsed === "object" &&
        "root" in (parsed as Record<string, unknown>)
      ) {
        return parsed as UiLayoutDocument;
      }
    } catch {
      return null;
    }
    return null;
  }

  const slotValues = Object.fromEntries(
    preset.fieldSlots.map((slot) => [
      slot.id,
      slot.sourceHint ?? fieldPaths[0] ?? "name",
    ]),
  );

  const result = applyPresetSlots(
    preset.kind,
    preset.templateJson,
    preset.fieldSlots,
    slotValues,
    { designSurface, definition, actionsInModalFooter: false },
  );

  if (!result.ok || !result.data) {
    return null;
  }

  if ("root" in result.data) {
    return result.data;
  }

  return null;
}

export function resolvePresetPreviewSurface(
  entry: PresetCatalogEntry,
): ReturnType<typeof resolveEntryPreviewSurface> {
  return resolveEntryPreviewSurface(entry);
}
