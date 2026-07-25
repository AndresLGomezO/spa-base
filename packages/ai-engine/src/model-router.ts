export type AiModelPurpose =
  | "planner"
  | "synthesis"
  | "memoryRefresh"
  | "embedding";

export interface ModelRouterDefaults {
  readonly flashModelId: string;
  readonly proModelId: string;
  readonly embeddingModelId?: string;
}

export interface ResolveModelForPurposeInput {
  readonly purpose: AiModelPurpose;
  readonly tenantId: string;
  readonly defaults: ModelRouterDefaults;
  /** Optional per-tenant overrides keyed by purpose. */
  readonly tenantOverrides?: Readonly<Partial<Record<AiModelPurpose, string>>>;
}

export interface ResolvedModel {
  readonly modelId: string;
  readonly purpose: AiModelPurpose;
}

const DEFAULT_EMBEDDING_MODEL = "text-embedding-005";

/**
 * Route planner vs synthesis vs memory vs embedding to flash / pro / embedding models.
 * Accepts `{ purpose, tenantId }` so future per-tenant overrides slot in.
 */
export function resolveModelForPurpose(
  input: ResolveModelForPurposeInput,
): ResolvedModel {
  const override = input.tenantOverrides?.[input.purpose];
  if (override?.trim()) {
    return { modelId: override.trim(), purpose: input.purpose };
  }

  switch (input.purpose) {
    case "planner":
      return { modelId: input.defaults.flashModelId, purpose: input.purpose };
    case "synthesis":
    case "memoryRefresh":
      return { modelId: input.defaults.proModelId, purpose: input.purpose };
    case "embedding":
      return {
        modelId:
          input.defaults.embeddingModelId?.trim() || DEFAULT_EMBEDDING_MODEL,
        purpose: input.purpose,
      };
    default: {
      const exhaustive: never = input.purpose;
      return { modelId: input.defaults.flashModelId, purpose: exhaustive };
    }
  }
}
