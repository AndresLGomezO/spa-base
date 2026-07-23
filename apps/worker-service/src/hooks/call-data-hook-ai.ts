import { extractJsonFromModelAnswer } from "@repo/ai-engine/extract-json-from-model-answer";
import {
  DATA_HOOK_AI_BATCH_MAX_OUTPUT_TOKENS,
  DATA_HOOK_AI_MAX_OUTPUT_TOKENS,
  DATA_HOOK_AI_THINKING_BUDGET,
  generateModelAnswer,
  type VertexAiConfig,
} from "@repo/ai-engine/vertex-ai.client";
import { HookExecutionError, type DataHookAiRequest } from "@repo/hooks";
import type { TenantScopedEntityRepository } from "@repo/firestore-converters";

const INCLUDE_ENTITY_LIMIT = 500;

/** Apply a category only when the model is at least this confident. */
export const CLASSIFY_MIN_CONFIDENCE = 0.95;

type GenericRecord = { readonly id: string; readonly tenantId: string };

export type CallDataHookAiDeps = {
  readonly vertexAiConfig: VertexAiConfig;
  readonly getRepository: (
    tenantId: string,
    entityName: string,
  ) => TenantScopedEntityRepository<GenericRecord, unknown> | undefined;
};

type CompactCategory = {
  readonly id: string;
  readonly name: string;
  readonly parentId?: string;
  readonly kind?: string;
};

function compactEntityRecord(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const compact: Record<string, unknown> = { id: record.id };
  for (const key of [
    "name",
    "parentId",
    "kind",
    "enabled",
    "categoryId",
    "type",
    "description",
  ] as const) {
    if (record[key] !== undefined) {
      compact[key] = record[key];
    }
  }
  return compact;
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
  const compact = result.items.map((item) =>
    compactEntityRecord(item as Record<string, unknown>),
  );
  const categories: CompactCategory[] =
    entityName === "category"
      ? result.items.flatMap((item) => {
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
  return { text: JSON.stringify(compact), categories };
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
    // High confidence so local mock paths still apply categories.
    confidence: categoryId ? 0.98 : 0.2,
  });
}

/**
 * Prefer an existing category when AI tries to create a near-duplicate leaf
 * (e.g. "Italian Food" when "Food" already exists).
 */
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

/**
 * Drop category assignment when confidence is missing or below the gate.
 */
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
  // Search grounding: skip JSON mime (handled inside generateModelAnswer).
  googleSearch: true,
  responseMimeType: "application/json" as const,
  thinkingBudget: DATA_HOOK_AI_THINKING_BUDGET,
};

/**
 * Domain-agnostic Vertex AI caller for the data-hook `callAi` action.
 */
export function createCallDataHookAi(
  deps: CallDataHookAiDeps,
): (request: DataHookAiRequest) => Promise<Record<string, unknown>> {
  return async (request) => {
    const { sections, categories } = await buildEntitySections(deps, request);
    const promptWithContext =
      sections.length > 0
        ? `${sections.join("\n\n")}\n\n---\n\n${request.prompt}`
        : request.prompt;

    try {
      if (deps.vertexAiConfig.mockEnabled) {
        return finalizeClassification(
          assertJsonObject(
            extractJsonFromModelAnswer(
              buildMockClassificationAnswer(promptWithContext),
            ),
          ),
          categories,
        );
      }

      const answer = await generateModelAnswer(
        deps.vertexAiConfig,
        {
          systemInstruction:
            request.systemInstruction ??
            "You are a structured data assistant. Reply with JSON only.",
          userText: promptWithContext,
        },
        {
          ...CLASSIFY_GENERATE_OPTIONS,
          maxOutputTokens: DATA_HOOK_AI_MAX_OUTPUT_TOKENS,
        },
      );
      return finalizeClassification(
        assertJsonObject(extractJsonFromModelAnswer(answer)),
        categories,
      );
    } catch (error) {
      if (error instanceof HookExecutionError) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : "callAi request failed.";
      throw new HookExecutionError(message);
    }
  };
}

/**
 * Classify multiple callAi requests in one Vertex round-trip.
 * Shared entity catalogs are injected once; each item keeps its own prompt body.
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
    const catalogBlock =
      sections.length > 0 ? `${sections.join("\n\n")}\n\n---\n\n` : "";

    const itemBlocks = requests.map((request, index) => {
      return `### Item ${index}\ncacheKey: ${request.cacheKey ?? String(index)}\n${request.prompt}`;
    });

    const batchPrompt = `${catalogBlock}Classify each item below. Reply with JSON only — compact objects, no markdown, no commentary:
{"results":[{"action":"useExisting"|"createChild"|"abstain","categoryId":"...|null","parentCategoryId":null,"newCategoryName":null,"kind":"EXPENSE","confidence":0.98}]}

One result object per item, same order as items. Always include confidence (0..1). Use abstain / null categoryId when not near-certain (confidence < 0.95). Colombia: specialty butcher/pollo/carne (e.g. Rica) → Food; supermarket chains (D1, Éxito, Carulla) → Groceries. Keep each object under 120 tokens.

${itemBlocks.join("\n\n")}`;

    const systemInstruction =
      first.systemInstruction ??
      "You are a structured data assistant. Reply with JSON only. Be extremely concise.";

    try {
      if (deps.vertexAiConfig.mockEnabled) {
        return requests.map((request) =>
          finalizeClassification(
            assertJsonObject(
              extractJsonFromModelAnswer(
                buildMockClassificationAnswer(
                  `${catalogBlock}${request.prompt}`,
                ),
              ),
            ),
            categories,
          ),
        );
      }

      let answer: string;
      try {
        answer = await generateModelAnswer(
          deps.vertexAiConfig,
          {
            systemInstruction,
            userText: batchPrompt,
          },
          {
            ...CLASSIFY_GENERATE_OPTIONS,
            maxOutputTokens: DATA_HOOK_AI_BATCH_MAX_OUTPUT_TOKENS,
          },
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "callAi batch request failed.";
        if (message.includes("max output tokens")) {
          return runSequential();
        }
        throw error;
      }

      try {
        const json = assertJsonObject(extractJsonFromModelAnswer(answer));
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
