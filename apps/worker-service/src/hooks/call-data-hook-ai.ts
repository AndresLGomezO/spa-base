import type { AiController } from "@repo/ai-engine/controller";
import {
  extractJsonFromModelAnswer,
  isRetriableTruncatedModelAnswerError,
} from "@repo/ai-engine/extract-json-from-model-answer";
import type { VertexCachedContentClient } from "@repo/ai-engine/grounded-chat";
import {
  DATA_HOOK_AI_BATCH_MAX_OUTPUT_TOKENS,
  DATA_HOOK_AI_MAX_OUTPUT_TOKENS,
  DATA_HOOK_AI_NARRATIVE_MAX_OUTPUT_TOKENS,
  DATA_HOOK_AI_NARRATIVE_THINKING_BUDGET,
  DATA_HOOK_AI_THINKING_BUDGET,
  type VertexAiConfig,
} from "@repo/ai-engine/vertex-ai.client";
import { HookExecutionError, type DataHookAiRequest } from "@repo/hooks";
import type { TenantScopedEntityRepository } from "@repo/firestore-converters";
import type { DataHookAiCacheRepository } from "@repo/firestore-converters/data-hook-ai-cache";

import { expandNarrativeCharts } from "./expand-narrative-charts.js";
import {
  ensureDataHookCachedContent,
  hashDataHookAiPrefix,
} from "./ensure-data-hook-cached-content.js";

const INCLUDE_ENTITY_LIMIT = 500;
/** One compact retry when Gemini returns STOP mid-JSON (seen on narrative summaries). */
const CALL_AI_TRUNCATION_RETRIES = 1;

const NARRATIVE_TRUNCATION_RETRY_HINT = `

---
Your previous answer was truncated mid-JSON (incomplete object). Reply again with ONE complete minimal valid JSON object only.
Keep "text" concise (shorter markdown), at most 2 compact charts, and close every brace/bracket. No markdown fences around the JSON.`;

const CLASSIFY_TRUNCATION_RETRY_HINT = `

---
Your previous answer was truncated mid-JSON. Reply again with ONE complete minimal valid JSON object only — no markdown fences, no trailing prose.`;

/** Apply a category only when the model is at least this confident. */
export const CLASSIFY_MIN_CONFIDENCE = 0.95;

type GenericRecord = { readonly id: string; readonly tenantId: string };

export type CallDataHookAiDeps = {
  readonly vertexAiConfig: VertexAiConfig;
  readonly aiController: AiController;
  readonly getRepository: (
    tenantId: string,
    entityName: string,
  ) => TenantScopedEntityRepository<GenericRecord, unknown> | undefined;
  /** Optional explicit Vertex CachedContent for classify catalogs. */
  readonly cacheClient?: VertexCachedContentClient;
  readonly cacheRepository?: DataHookAiCacheRepository;
  readonly isDataHookAiCacheEnabled?: () => boolean | Promise<boolean>;
};

type CompactCategory = {
  readonly id: string;
  readonly name: string;
  readonly parentId?: string;
  readonly kind?: string;
};

/** Fixed key order so catalog JSON is byte-stable across runs (prompt cache). */
const COMPACT_ENTITY_KEYS = [
  "id",
  "name",
  "parentId",
  "kind",
  "enabled",
  "categoryId",
  "type",
  "description",
] as const;

export function compactEntityRecord(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const compact: Record<string, unknown> = {};
  for (const key of COMPACT_ENTITY_KEYS) {
    if (key === "id") {
      compact.id = record.id;
      continue;
    }
    if (record[key] !== undefined) {
      compact[key] = record[key];
    }
  }
  return compact;
}

/** Deterministic JSON for includeEntities catalogs (stable Vertex prefix). */
export function stableJsonStringify(
  records: readonly Record<string, unknown>[],
): string {
  return `[${records
    .map((record) => {
      const parts: string[] = [];
      for (const key of COMPACT_ENTITY_KEYS) {
        if (!(key in record) || record[key] === undefined) {
          continue;
        }
        parts.push(`${JSON.stringify(key)}:${JSON.stringify(record[key])}`);
      }
      return `{${parts.join(",")}}`;
    })
    .join(",")}]`;
}

export function sortRecordsById<T extends { readonly id?: unknown }>(
  items: readonly T[],
): T[] {
  return [...items].sort((left, right) => {
    const leftId = typeof left.id === "string" ? left.id : "";
    const rightId = typeof right.id === "string" ? right.id : "";
    return leftId.localeCompare(rightId);
  });
}

async function loadIncludeEntityContext(
  deps: CallDataHookAiDeps,
  tenantId: string,
  entityName: string,
): Promise<{ readonly text: string; readonly categories: CompactCategory[] }> {
  const repository = deps.getRepository(tenantId, entityName);
  if (!repository) {
    throw new HookExecutionError(
      `callAi includeEntities: repository for "${entityName}" is not available.`,
    );
  }
  const result = await repository.findAll({
    tenantId,
    limit: INCLUDE_ENTITY_LIMIT,
  });
  const sorted = sortRecordsById(result.items);
  const compact = sorted.map((item) =>
    compactEntityRecord(item as Record<string, unknown>),
  );
  const categories: CompactCategory[] =
    entityName === "category"
      ? sorted.flatMap((item) => {
          const row = item as Record<string, unknown>;
          if (typeof row.id !== "string" || typeof row.name !== "string") {
            return [];
          }
          return [
            {
              id: row.id,
              name: row.name,
              ...(typeof row.parentId === "string"
                ? { parentId: row.parentId }
                : {}),
              ...(typeof row.kind === "string" ? { kind: row.kind } : {}),
            },
          ];
        })
      : [];
  return { text: stableJsonStringify(compact), categories };
}

function buildMockClassificationAnswer(prompt: string): string {
  const existingIdMatch = prompt.match(/"id"\s*:\s*"([a-zA-Z0-9_-]{4,})"/);
  const categoryId = existingIdMatch?.[1] ?? null;
  return JSON.stringify({
    action: "useExisting",
    categoryId,
    parentCategoryId: null,
    newCategoryName: null,
    kind: "EXPENSE",
    confidence: categoryId ? 0.98 : 0.2,
  });
}

export function coerceNearDuplicateCreateChild(
  result: Record<string, unknown>,
  categories: readonly CompactCategory[],
): Record<string, unknown> {
  if (result.action !== "createChild") {
    return result;
  }
  const rawName = result.newCategoryName;
  if (typeof rawName !== "string" || rawName.trim().length === 0) {
    return result;
  }
  const newName = rawName.trim().toLowerCase();
  const exact = categories.find(
    (category) => category.name.trim().toLowerCase() === newName,
  );
  if (exact) {
    return {
      ...result,
      action: "useExisting",
      categoryId: exact.id,
      newCategoryName: null,
      parentCategoryId: null,
    };
  }

  let best: CompactCategory | null = null;
  for (const category of categories) {
    const existing = category.name.trim().toLowerCase();
    if (existing.length < 4) {
      continue;
    }
    if (newName.includes(existing) || existing.includes(newName)) {
      if (!best || existing.length > best.name.length) {
        best = category;
      }
    }
  }
  if (!best) {
    return result;
  }
  return {
    ...result,
    action: "useExisting",
    categoryId: best.id,
    newCategoryName: null,
    parentCategoryId: null,
  };
}

export function applyClassifyConfidenceGate(
  result: Record<string, unknown>,
  minConfidence: number = CLASSIFY_MIN_CONFIDENCE,
): Record<string, unknown> {
  const raw = result.confidence;
  const confidence =
    typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  if (confidence !== null && confidence >= minConfidence) {
    return result;
  }
  return {
    ...result,
    action: "abstain",
    categoryId: null,
    parentCategoryId: null,
    newCategoryName: null,
    confidence: confidence ?? 0,
  };
}

function finalizeClassification(
  result: Record<string, unknown>,
  categories: readonly CompactCategory[],
): Record<string, unknown> {
  return applyClassifyConfidenceGate(
    coerceNearDuplicateCreateChild(result, categories),
  );
}

function assertJsonObject(json: unknown): Record<string, unknown> {
  if (json === null || typeof json !== "object" || Array.isArray(json)) {
    throw new HookExecutionError("callAi response must be a JSON object.");
  }
  return json as Record<string, unknown>;
}

async function buildEntitySections(
  deps: CallDataHookAiDeps,
  request: DataHookAiRequest,
): Promise<{
  readonly sections: string[];
  readonly categories: CompactCategory[];
}> {
  const sections: string[] = [];
  const categories: CompactCategory[] = [];
  for (const entityName of request.includeEntities ?? []) {
    const loaded = await loadIncludeEntityContext(
      deps,
      request.tenantId,
      entityName,
    );
    sections.push(`## entity:${entityName}\n${loaded.text}`);
    categories.push(...loaded.categories);
  }
  return { sections, categories };
}

const CLASSIFY_GENERATE_OPTIONS = {
  // Google Search grounding blocks Vertex prompt caching on Gemini; classify
  // only needs the provided catalog, so keep search off for cache hits.
  googleSearch: false,
  responseMimeType: "application/json" as const,
  thinkingBudget: DATA_HOOK_AI_THINKING_BUDGET,
};

const NARRATIVE_GENERATE_OPTIONS = {
  googleSearch: false,
  responseMimeType: "application/json" as const,
  thinkingBudget: DATA_HOOK_AI_NARRATIVE_THINKING_BUDGET,
  maxOutputTokens: DATA_HOOK_AI_NARRATIVE_MAX_OUTPUT_TOKENS,
};

function isClassifyRequest(request: DataHookAiRequest): boolean {
  return (request.includeEntities?.length ?? 0) > 0;
}

type CallAiModelOptions = {
  readonly modelId?: string;
  readonly googleSearch?: boolean;
  readonly responseMimeType?: "text/plain" | "application/json";
  readonly thinkingBudget?: number;
  readonly maxOutputTokens?: number;
  readonly cachedContent?: string;
};

async function resolveClassifyCachedContent(
  deps: CallDataHookAiDeps,
  input: {
    readonly tenantId: string;
    readonly hookId: string;
    readonly systemInstruction: string;
    readonly prefixText: string;
  },
): Promise<string | null> {
  if (
    !input.prefixText ||
    !deps.cacheClient ||
    !deps.cacheRepository ||
    deps.vertexAiConfig.mockEnabled
  ) {
    return null;
  }
  const enabled = deps.isDataHookAiCacheEnabled
    ? await deps.isDataHookAiCacheEnabled()
    : false;
  if (!enabled) {
    return null;
  }
  const result = await ensureDataHookCachedContent({
    config: deps.vertexAiConfig,
    cacheClient: deps.cacheClient,
    cacheRepository: deps.cacheRepository,
    tenantId: input.tenantId,
    hookId: input.hookId,
    systemInstruction: input.systemInstruction,
    prefixText: input.prefixText,
    prefixHash: hashDataHookAiPrefix({
      systemInstruction: input.systemInstruction,
      prefixText: input.prefixText,
    }),
  });
  return result.cachedContentName;
}

async function runTrackedText(
  deps: CallDataHookAiDeps,
  request: DataHookAiRequest,
  promptWithContext: string,
  modelOptions: CallAiModelOptions,
): Promise<string> {
  const systemInstruction =
    request.systemInstruction ??
    "You are a structured data assistant. Reply with JSON only.";
  const result = await deps.aiController.runAiRequest({
    tenantId: request.tenantId,
    feature: "dataHookCallAi",
    operation: "generateText",
    requestedBy: "system",
    permission: "ai.dataHook.run",
    input: {
      kind: "dataHookCallAi",
      hookId: request.hookId ?? "unknown",
      ...(request.hookName ? { hookName: request.hookName } : {}),
      ...(request.hookExecutionId
        ? { hookExecutionId: request.hookExecutionId }
        : {}),
      ...(request.recordId ? { recordId: request.recordId } : {}),
      ...(request.entityName ? { entityName: request.entityName } : {}),
      prompt: promptWithContext,
      ...(request.systemInstruction
        ? { systemInstruction: request.systemInstruction }
        : {}),
      ...(request.cacheKey ? { cacheKey: request.cacheKey } : {}),
      ...(request.includeEntities
        ? { includeEntities: [...request.includeEntities] }
        : {}),
    },
    ...(request.hookExecutionId
      ? {
          contextRef: {
            source: "hookExecution" as const,
            id: request.hookExecutionId,
          },
        }
      : {}),
    params: {
      operation: "generateText",
      systemInstruction,
      userText: promptWithContext,
      modelOptions,
    },
  });
  if (!("text" in result.output) || typeof result.output.text !== "string") {
    throw new HookExecutionError("callAi response missing text.");
  }
  return result.output.text;
}

/**
 * Domain-agnostic Vertex AI caller for the data-hook `callAi` action.
 * Every request is recorded via the unified AI controller.
 */
export function createCallDataHookAi(
  deps: CallDataHookAiDeps,
): (request: DataHookAiRequest) => Promise<Record<string, unknown>> {
  return async (request) => {
    const { sections, categories } = await buildEntitySections(deps, request);
    const prefixText =
      sections.length > 0 ? `${sections.join("\n\n")}\n\n---\n\n` : "";
    const classify = isClassifyRequest(request);
    const systemInstruction =
      request.systemInstruction ??
      "You are a structured data assistant. Reply with JSON only.";
    const cachedContentName = classify
      ? await resolveClassifyCachedContent(deps, {
          tenantId: request.tenantId,
          hookId: request.hookId ?? "unknown",
          systemInstruction,
          prefixText,
        })
      : null;
    const promptWithContext =
      cachedContentName && prefixText
        ? request.prompt
        : prefixText
          ? `${prefixText}${request.prompt}`
          : request.prompt;
    const useReasoning = request.model === "reasoning";
    const reasoningModelId =
      deps.vertexAiConfig.reasoningModelId ?? deps.vertexAiConfig.modelId;
    const flashModelId = deps.vertexAiConfig.modelId;
    const modelOptions: CallAiModelOptions = classify
      ? {
          ...CLASSIFY_GENERATE_OPTIONS,
          maxOutputTokens: DATA_HOOK_AI_MAX_OUTPUT_TOKENS,
          ...(cachedContentName ? { cachedContent: cachedContentName } : {}),
        }
      : useReasoning
        ? {
            ...NARRATIVE_GENERATE_OPTIONS,
            modelId: reasoningModelId,
          }
        : {
            ...NARRATIVE_GENERATE_OPTIONS,
            modelId: flashModelId,
          };

    if (deps.vertexAiConfig.mockEnabled && classify) {
      const mockPrompt = prefixText
        ? `${prefixText}${request.prompt}`
        : request.prompt;
      return finalizeClassification(
        assertJsonObject(
          extractJsonFromModelAnswer(
            buildMockClassificationAnswer(mockPrompt),
          ),
        ),
        categories,
      );
    }

    let lastError: unknown;
    for (let attempt = 0; attempt <= CALL_AI_TRUNCATION_RETRIES; attempt += 1) {
      const userText =
        attempt === 0
          ? promptWithContext
          : `${promptWithContext}${
              classify
                ? CLASSIFY_TRUNCATION_RETRY_HINT
                : NARRATIVE_TRUNCATION_RETRY_HINT
            }`;
      try {
        const answer = await runTrackedText(
          deps,
          request,
          userText,
          modelOptions,
        );
        const parsed = assertJsonObject(extractJsonFromModelAnswer(answer));
        return classify
          ? finalizeClassification(parsed, categories)
          : expandNarrativeCharts(parsed);
      } catch (error) {
        lastError = error;
        if (
          attempt < CALL_AI_TRUNCATION_RETRIES &&
          isRetriableTruncatedModelAnswerError(error)
        ) {
          continue;
        }
        if (error instanceof HookExecutionError) {
          throw error;
        }
        const message =
          error instanceof Error ? error.message : "callAi request failed.";
        throw new HookExecutionError(message);
      }
    }

    const message =
      lastError instanceof Error ? lastError.message : "callAi request failed.";
    throw new HookExecutionError(message);
  };
}

/**
 * Classify multiple callAi requests in one Vertex round-trip.
 */
export function createBatchCallDataHookAi(
  deps: CallDataHookAiDeps,
): (
  requests: readonly DataHookAiRequest[],
) => Promise<readonly Record<string, unknown>[]> {
  const single = createCallDataHookAi(deps);
  return async (requests) => {
    if (requests.length === 0) {
      return [];
    }
    if (requests.length === 1) {
      return [await single(requests[0]!)];
    }

    const first = requests[0]!;
    const { sections, categories } = await buildEntitySections(deps, first);
    const prefixText =
      sections.length > 0 ? `${sections.join("\n\n")}\n\n---\n\n` : "";
    const systemInstruction =
      first.systemInstruction ??
      "You are a structured data assistant. Reply with JSON only. Be extremely concise.";
    const cachedContentName = await resolveClassifyCachedContent(deps, {
      tenantId: first.tenantId,
      hookId: first.hookId ?? "unknown",
      systemInstruction,
      prefixText,
    });

    const itemBlocks = requests.map((request, index) => {
      return `### Item ${index}\ncacheKey: ${request.cacheKey ?? String(index)}\n${request.prompt}`;
    });

    const batchTail = `Classify each item below. Reply with JSON only — compact objects, no markdown, no commentary:
{"results":[{"action":"useExisting"|"createChild"|"abstain","categoryId":"...|null","parentCategoryId":null,"newCategoryName":null,"kind":"EXPENSE","confidence":0.98}]}

One result object per item, same order as items. Always include confidence (0..1). Use abstain / null categoryId when not near-certain (confidence < 0.95). Colombia: specialty butcher/pollo/carne (e.g. Rica) → Food; supermarket chains (D1, Éxito, Carulla) → Groceries. Keep each object under 120 tokens.

${itemBlocks.join("\n\n")}`;

    const batchPrompt =
      cachedContentName && prefixText
        ? batchTail
        : `${prefixText}${batchTail}`;

    try {
      const parent = await deps.aiController.runAiRequest({
        tenantId: first.tenantId,
        feature: "dataHookBatchCallAi",
        operation: "generateText",
        requestedBy: "system",
        permission: "ai.dataHook.run",
        input: {
          kind: "dataHookBatchCallAi",
          itemCount: requests.length,
          ...(first.hookId ? { hookId: first.hookId } : {}),
          ...(first.hookName ? { hookName: first.hookName } : {}),
          promptPreview: batchPrompt.slice(0, 500),
        },
        params: {
          operation: "generateText",
          systemInstruction,
          userText: batchPrompt,
          modelOptions: {
            ...CLASSIFY_GENERATE_OPTIONS,
            maxOutputTokens: DATA_HOOK_AI_BATCH_MAX_OUTPUT_TOKENS,
            ...(cachedContentName ? { cachedContent: cachedContentName } : {}),
          },
        },
      });

      if (
        !("text" in parent.output) ||
        typeof parent.output.text !== "string"
      ) {
        return runSequential();
      }

      try {
        const json = assertJsonObject(
          extractJsonFromModelAnswer(parent.output.text),
        );
        const results = json.results;
        if (!Array.isArray(results) || results.length !== requests.length) {
          return runSequential();
        }
        return results.map((entry) =>
          finalizeClassification(assertJsonObject(entry), categories),
        );
      } catch {
        return runSequential();
      }

      async function runSequential(): Promise<Record<string, unknown>[]> {
        const fallback: Record<string, unknown>[] = [];
        for (const request of requests) {
          fallback.push(await single(request));
        }
        return fallback;
      }
    } catch (error) {
      if (error instanceof HookExecutionError) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : "callAi batch request failed.";
      throw new HookExecutionError(message);
    }
  };
}
