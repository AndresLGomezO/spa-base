import { useMemo } from "react";
import type { UiBuilderPresetRecord } from "@repo/entities";
import {
  listBuiltInTemplates,
  type BuiltInComponentTemplateId,
  type DesignSurface,
} from "@repo/ui-builder-core";

export type LayoutSystemPresetSelection =
  | { readonly source: "builtin"; readonly id: BuiltInComponentTemplateId }
  | { readonly source: "tenant"; readonly id: string };

export type LayoutPresetId =
  | BuiltInComponentTemplateId
  | `tenant:${string}`
  | "custom";

interface LayoutSystemPresetCatalogEntry {
  readonly selection: LayoutSystemPresetSelection;
  readonly value: LayoutPresetId;
  readonly label: string;
  readonly description?: string;
  readonly isDefault?: boolean;
  readonly group: "platform" | "tenant";
  readonly tenantPreset?: UiBuilderPresetRecord;
}

function toTenantPresetValue(id: string): LayoutPresetId {
  return `tenant:${id}`;
}

export function selectionToPresetValue(
  selection: LayoutSystemPresetSelection,
): LayoutPresetId {
  return selection.source === "builtin"
    ? selection.id
    : toTenantPresetValue(selection.id);
}

export function useLayoutSystemPresetCatalog(input: {
  readonly surfaces: readonly DesignSurface[];
  readonly fieldPaths: readonly string[];
  readonly tenantPresets: readonly UiBuilderPresetRecord[];
  readonly builtinLabel: (id: BuiltInComponentTemplateId) => string;
  readonly builtinDescription?: (
    id: BuiltInComponentTemplateId,
  ) => string | undefined;
}): {
  readonly entries: readonly LayoutSystemPresetCatalogEntry[];
  readonly platformEntries: readonly LayoutSystemPresetCatalogEntry[];
  readonly tenantEntries: readonly LayoutSystemPresetCatalogEntry[];
} {
  const {
    surfaces,
    fieldPaths,
    tenantPresets,
    builtinLabel,
    builtinDescription,
  } = input;

  return useMemo(() => {
    const surfaceSet = new Set<DesignSurface>(surfaces);
    const builtinById = new Map<
      BuiltInComponentTemplateId,
      LayoutSystemPresetCatalogEntry
    >();

    for (const surface of surfaces) {
      for (const template of listBuiltInTemplates(surface, { fieldPaths })) {
        if (builtinById.has(template.id)) {
          continue;
        }
        builtinById.set(template.id, {
          selection: { source: "builtin", id: template.id },
          value: template.id,
          label: builtinLabel(template.id),
          description:
            builtinDescription?.(template.id) ?? template.description,
          isDefault: template.isDefault,
          group: "platform",
        });
      }
    }

    const platformEntries = [...builtinById.values()].sort((left, right) => {
      if (left.isDefault && !right.isDefault) {
        return -1;
      }
      if (!left.isDefault && right.isDefault) {
        return 1;
      }
      return left.label.localeCompare(right.label);
    });

    const tenantEntries = tenantPresets
      .filter(
        (preset) =>
          preset.kind === "layout-document" &&
          (preset.designSurface === undefined ||
            surfaceSet.has(preset.designSurface)),
      )
      .map(
        (preset): LayoutSystemPresetCatalogEntry => ({
          selection: { source: "tenant", id: preset.id },
          value: toTenantPresetValue(preset.id),
          label: preset.name,
          description: preset.description,
          group: "tenant",
          tenantPreset: preset,
        }),
      )
      .sort((left, right) => left.label.localeCompare(right.label));

    return {
      entries: [...platformEntries, ...tenantEntries],
      platformEntries,
      tenantEntries,
    };
  }, [builtinDescription, builtinLabel, fieldPaths, surfaces, tenantPresets]);
}
