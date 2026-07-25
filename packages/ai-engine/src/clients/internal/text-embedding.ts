import type { AiJobModelUsage } from "../../schemas/ai-job.schema.js";
import type { VertexAiConfig } from "./vertex-ai.client.js";

/** Default embedding model (English/code, 768-dim). */
export const DEFAULT_EMBEDDING_MODEL_ID = "text-embedding-005";

/** Fixed output dimensionality for stored vectors. */
export const DEFAULT_EMBEDDING_DIMENSIONS = 768;

export type EmbeddingTaskType =
  | "RETRIEVAL_QUERY"
  | "RETRIEVAL_DOCUMENT"
  | "SEMANTIC_SIMILARITY"
  | "CLASSIFICATION"
  | "CLUSTERING";

export interface GenerateTextEmbeddingOptions {
  readonly modelId?: string;
  readonly taskType?: EmbeddingTaskType;
  readonly outputDimensionality?: number;
}

export interface GenerateTextEmbeddingResult {
  readonly vector: readonly number[];
  readonly usage: AiJobModelUsage;
}

function optionalNonNegInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : undefined;
}

function parseEmbeddingUsageMetadata(
  modelId: string,
  prediction: unknown,
  inputCharacters: number,
  outputDimensions: number,
): AiJobModelUsage {
  let promptTokens: number | undefined;
  let billableCharacters: number | undefined;

  if (prediction != null && typeof prediction === "object") {
    const asProto = prediction as {
      readonly structValue?: {
        readonly fields?: {
          readonly statistics?: {
            readonly structValue?: {
              readonly fields?: {
                readonly token_count?: { readonly numberValue?: number | null };
                readonly truncated?: { readonly boolValue?: boolean | null };
              };
            };
          };
          readonly embeddings?: {
            readonly structValue?: {
              readonly fields?: {
                readonly statistics?: {
                  readonly structValue?: {
                    readonly fields?: {
                      readonly token_count?: {
                        readonly numberValue?: number | null;
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    };

    promptTokens =
      optionalNonNegInt(
        asProto.structValue?.fields?.embeddings?.structValue?.fields?.statistics
          ?.structValue?.fields?.token_count?.numberValue,
      ) ??
      optionalNonNegInt(
        asProto.structValue?.fields?.statistics?.structValue?.fields
          ?.token_count?.numberValue,
      );

    const record = prediction as Record<string, unknown>;
    const metadata = record.metadata;
    if (metadata != null && typeof metadata === "object") {
      const meta = metadata as Record<string, unknown>;
      promptTokens =
        promptTokens ??
        optionalNonNegInt(meta.tokenCount) ??
        optionalNonNegInt(meta.token_count);
      billableCharacters =
        optionalNonNegInt(meta.billableCharacterCount) ??
        optionalNonNegInt(meta.billable_character_count);
    }

    const embeddings = record.embeddings;
    if (
      embeddings != null &&
      typeof embeddings === "object" &&
      !Array.isArray(embeddings)
    ) {
      const stats = (embeddings as Record<string, unknown>).statistics;
      if (stats != null && typeof stats === "object") {
        const statsRecord = stats as Record<string, unknown>;
        promptTokens =
          promptTokens ??
          optionalNonNegInt(statsRecord.token_count) ??
          optionalNonNegInt(statsRecord.tokenCount);
      }
    }
  }

  return {
    modelId,
    outputDimensions,
    inputCharacters: billableCharacters ?? inputCharacters,
    ...(promptTokens != null ? { promptTokens } : {}),
  };
}

/**
 * Deterministic mock embedding for local/dev (mockEnabled).
 * Similar normalized strings share similar vectors so cosine matching works in tests.
 */
export function buildMockTextEmbedding(
  text: string,
  dimensions: number = DEFAULT_EMBEDDING_DIMENSIONS,
): number[] {
  const normalized = text.trim().toUpperCase();
  const values = new Array<number>(dimensions).fill(0);
  if (normalized.length === 0) {
    values[0] = 1;
    return values;
  }

  for (let i = 0; i < normalized.length; i += 1) {
    const code = normalized.charCodeAt(i);
    const index = (code * (i + 1)) % dimensions;
    values[index] = (values[index] ?? 0) + 1;
  }

  // Token-level bumps so shared words align across variants.
  for (const token of normalized.split(/\s+/).filter(Boolean)) {
    let hash = 0;
    for (let i = 0; i < token.length; i += 1) {
      hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
    }
    const index = hash % dimensions;
    values[index] = (values[index] ?? 0) + 3;
  }

  return l2Normalize(values);
}

export function cosineSimilarity(
  a: readonly number[],
  b: readonly number[],
): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function l2Normalize(values: readonly number[]): number[] {
  let norm = 0;
  for (const value of values) {
    norm += value * value;
  }
  if (norm === 0) {
    const next = [...values];
    next[0] = 1;
    return next;
  }
  const scale = 1 / Math.sqrt(norm);
  return values.map((value) => value * scale);
}

function numberFromProtoValue(value: {
  readonly numberValue?: number | null;
}): number {
  if (
    typeof value.numberValue === "number" &&
    Number.isFinite(value.numberValue)
  ) {
    return value.numberValue;
  }
  throw new Error("Vertex embedding contains a non-numeric value.");
}

function parseEmbeddingPrediction(prediction: unknown): number[] {
  // protobuf.Value shape from PredictionService
  const asProto = prediction as {
    readonly structValue?: {
      readonly fields?: {
        readonly embeddings?: {
          readonly structValue?: {
            readonly fields?: {
              readonly values?: {
                readonly listValue?: {
                  readonly values?: ReadonlyArray<{
                    readonly numberValue?: number | null;
                  }>;
                };
              };
            };
          };
        };
      };
    };
  };

  const listValues =
    asProto.structValue?.fields?.embeddings?.structValue?.fields?.values
      ?.listValue?.values;
  if (listValues && listValues.length > 0) {
    return listValues.map(numberFromProtoValue);
  }

  // Plain JSON / toJSON fallback
  if (
    prediction != null &&
    typeof prediction === "object" &&
    !Array.isArray(prediction)
  ) {
    const record = prediction as Record<string, unknown>;
    const embeddings = record.embeddings;
    if (
      embeddings != null &&
      typeof embeddings === "object" &&
      !Array.isArray(embeddings)
    ) {
      const values = (embeddings as Record<string, unknown>).values;
      if (Array.isArray(values)) {
        return values.map((value) => {
          if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new Error("Vertex embedding contains a non-numeric value.");
          }
          return value;
        });
      }
    }
  }

  throw new Error("Vertex embedding prediction missing values array.");
}

/**
 * Generate a text embedding via Vertex AI Prediction API.
 * When `config.mockEnabled`, returns a deterministic local vector (no network).
 */
export async function generateTextEmbedding(
  config: VertexAiConfig,
  text: string,
  options?: GenerateTextEmbeddingOptions,
): Promise<GenerateTextEmbeddingResult> {
  const trimmed = text.trim();
  const dimensions =
    options?.outputDimensionality ?? DEFAULT_EMBEDDING_DIMENSIONS;
  const modelId = options?.modelId ?? DEFAULT_EMBEDDING_MODEL_ID;

  if (config.mockEnabled) {
    const vector = buildMockTextEmbedding(trimmed, dimensions);
    return {
      vector,
      usage: {
        modelId: "mock",
        outputDimensions: vector.length,
        inputCharacters: trimmed.length,
      },
    };
  }

  if (trimmed.length === 0) {
    const vector = buildMockTextEmbedding("", dimensions);
    return {
      vector,
      usage: {
        modelId,
        outputDimensions: vector.length,
        inputCharacters: 0,
      },
    };
  }

  const taskType = options?.taskType ?? "SEMANTIC_SIMILARITY";
  const location = config.region;
  const apiEndpoint = `${location}-aiplatform.googleapis.com`;

  const aiplatform = await import("@google-cloud/aiplatform");
  const { PredictionServiceClient } = aiplatform.v1;
  const { helpers } = aiplatform;

  const client = new PredictionServiceClient({ apiEndpoint });
  const endpoint = `projects/${config.projectId}/locations/${location}/publishers/google/models/${modelId}`;

  const instance = helpers.toValue({
    content: trimmed,
    task_type: taskType,
  });
  const parameters = helpers.toValue({
    outputDimensionality: dimensions,
  });

  const [response] = await client.predict({
    endpoint,
    instances: [instance!],
    parameters: parameters!,
  });

  const prediction = response.predictions?.[0];
  if (!prediction) {
    throw new Error("Vertex embedding API returned no predictions.");
  }

  const vector = parseEmbeddingPrediction(prediction);
  return {
    vector,
    usage: parseEmbeddingUsageMetadata(
      modelId,
      prediction,
      trimmed.length,
      vector.length,
    ),
  };
}

export function readEmbeddingField(
  record: Record<string, unknown>,
  fieldName: string,
): number[] | null {
  const raw = record[fieldName];
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }
  const values: number[] = [];
  for (const entry of raw) {
    if (typeof entry !== "number" || !Number.isFinite(entry)) {
      return null;
    }
    values.push(entry);
  }
  return values;
}

export function pickBestEmbeddingMatch<
  T extends Record<string, unknown>,
>(options: {
  readonly query: readonly number[];
  readonly candidates: readonly T[];
  readonly embeddingField: string;
  readonly minScore: number;
}): { readonly record: T; readonly score: number } | null {
  let best: T | null = null;
  let bestScore = -1;
  for (const candidate of options.candidates) {
    const embedding = readEmbeddingField(candidate, options.embeddingField);
    if (!embedding) {
      continue;
    }
    const score = cosineSimilarity(options.query, embedding);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  if (!best || bestScore < options.minScore) {
    return null;
  }
  return { record: best, score: bestScore };
}
