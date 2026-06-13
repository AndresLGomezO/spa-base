import type {
  CreateUiBuilderSuggestionInput,
  UiBuilderSuggestionRecord,
} from "@repo/ai-engine/schemas";

export type { UiBuilderSuggestionRecord };

export interface UiBuilderAiSuggestionRepository {
  create(
    tenantId: string,
    input: CreateUiBuilderSuggestionInput,
  ): Promise<UiBuilderSuggestionRecord>;
  getById(
    tenantId: string,
    id: string,
  ): Promise<UiBuilderSuggestionRecord | null>;
  listByEntityAndSurface(
    tenantId: string,
    entityName: string,
    surface: UiBuilderSuggestionRecord["surface"],
  ): Promise<readonly UiBuilderSuggestionRecord[]>;
}
