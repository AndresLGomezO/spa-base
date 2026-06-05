import type {
  CreateUiBuilderPresetInput,
  UiBuilderPresetRecord,
  UpdateUiBuilderPresetInput,
} from "@repo/entities";

export interface UiBuilderPresetRepository {
  list(tenantId: string): Promise<readonly UiBuilderPresetRecord[]>;
  get(
    tenantId: string,
    presetId: string,
  ): Promise<UiBuilderPresetRecord | null>;
  create(
    tenantId: string,
    input: CreateUiBuilderPresetInput,
  ): Promise<UiBuilderPresetRecord>;
  update(
    tenantId: string,
    presetId: string,
    input: UpdateUiBuilderPresetInput,
  ): Promise<UiBuilderPresetRecord>;
  delete(tenantId: string, presetId: string): Promise<void>;
}
