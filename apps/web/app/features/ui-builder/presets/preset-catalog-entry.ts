import type {
  UiBuilderPresetKind,
  UiBuilderPresetRecord,
} from "@repo/entities";
import type {
  BuiltInComponentTemplateId,
  DesignSurface,
} from "@repo/ui-builder-core";

export type PresetSourceFilter = "platform" | "tenant";

export type PresetCatalogEntryId =
  | `platform:${BuiltInComponentTemplateId}`
  | `tenant:${string}`;

export interface PresetCatalogEntry {
  readonly id: PresetCatalogEntryId;
  readonly source: PresetSourceFilter;
  readonly name: string;
  readonly description?: string;
  readonly kind: UiBuilderPresetKind;
  readonly designSurface?: DesignSurface;
  readonly surfaces?: readonly DesignSurface[];
  readonly isDefault?: boolean;
  readonly fieldSlotCount: number;
  readonly updatedAt?: string;
  readonly builtinId?: BuiltInComponentTemplateId;
  readonly tenantPreset?: UiBuilderPresetRecord;
}

export function tenantPresetIdFromEntryId(id: `tenant:${string}`): string {
  return id.slice("tenant:".length);
}
