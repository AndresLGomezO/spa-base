import type {
  AiChatSessionRecord,
  TenantAiContextRepository,
  UserAiMemoryRepository,
} from "@repo/ai-context";
import { extractJsonFromModelAnswer } from "../extract-json-from-model-answer.js";
import type { AiController } from "../controller/index.js";
import type { AiChatOutput } from "../schemas/ai-job.schema.js";
import type { VertexAiConfig } from "../vertex-ai.client.js";
import { resolveModelForPurpose } from "../model-router.js";

import { assembleGroundedChatPrefix } from "./assemble-prefix.js";
import {
  GROUNDED_CHAT_MAX_STEPS,
  GROUNDED_CHAT_PLANNER_OUTPUT_INSTRUCTION,
  groundedChatPlannerResponseSchema,
  type GroundedChatCitation,
} from "./constants.js";
import { ensureVertexCacheForUserMemory } from "./ensure-vertex-cache.js";
import {
  executeGroundedChatTool,
  mergeCitations,
  toAiChatCitations,
  type GroundedChatDataPorts,
} from "./tools.js";
import type { VertexCachedContentClient } from "./vertex-cached-content.js";

export interface RunGroundedChatOrchestratorInput {
  readonly tenantId: string;
  readonly userId: string;
  readonly question: string;
  readonly parentJobId: string;
  readonly session?: AiChatSessionRecord | null;
}

export interface RunGroundedChatOrchestratorDeps {
  readonly aiController: AiController;
  readonly vertexAiConfig: VertexAiConfig;
  readonly tenantAiContextRepository: TenantAiContextRepository;
  readonly userAiMemoryRepository: UserAiMemoryRepository;
  readonly dataPorts: GroundedChatDataPorts;
  readonly cacheClient: VertexCachedContentClient;
  readonly now?: () => Date;
  /** When false, prior session scratchpad is ignored and result.scratchpad is empty. */
  readonly isAiTraceEnabled?: () => boolean | Promise<boolean>;
}

export interface GroundedChatOrchestratorMetrics {
  readonly stepCount: number;
  readonly toolCallCount: number;
  readonly cacheHit: boolean;
  readonly retrievalTop1Score?: number;
  readonly confidence?: number;
  readonly parseRetryCount: number;
}

export interface GroundedChatOrchestratorResult extends AiChatOutput {
  readonly scratchpad: string;
  readonly stepCount: number;
  readonly metrics: GroundedChatOrchestratorMetrics;
}

function buildConversationBlock(
  session: AiChatSessionRecord | null | undefined,
  question: string,
): string {
  const prior = (session?.messages ?? [])
    .slice(-8)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");
  const parts = [
    prior ? `## Prior turns\n${prior}` : "",
    `## Current question\n${question}`,
  ].filter(Boolean);
  return parts.join("\n\n");
}

export async function runGroundedChatOrchestrator(
  deps: RunGroundedChatOrchestratorDeps,
  input: RunGroundedChatOrchestratorInput,
): Promise<GroundedChatOrchestratorResult> {
  const traceEnabled = deps.isAiTraceEnabled
    ? Boolean(await deps.isAiTraceEnabled())
    : false;

  const catalog = await deps.tenantAiContextRepository.get(
    input.tenantId,
    "entityCatalog",
  );
  let memory = await deps.userAiMemoryRepository.get(
    input.tenantId,
    input.userId,
  );

  const assembled = assembleGroundedChatPrefix({
    entityCatalog: catalog,
    memory,
  });

  if (!memory) {
    const nowIso = (deps.now ?? (() => new Date()))().toISOString();
    memory = await deps.userAiMemoryRepository.upsert({
      id: input.userId,
      tenantId: input.tenantId,
      userId: input.userId,
      profileFragment: "",
      dataSnapshot: "",
      factIndex: [],
      sourceHash: "empty",
      vertexCacheName: null,
      vertexCacheExpireAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  const cacheResult = await ensureVertexCacheForUserMemory({
    config: deps.vertexAiConfig,
    cacheClient: deps.cacheClient,
    memoryRepository: deps.userAiMemoryRepository,
    memory,
    assembled,
    ...(deps.now ? { now: deps.now } : {}),
  });
  memory = cacheResult.memory;

  const scratchpadParts: string[] = [];
  if (traceEnabled && input.session?.scratchpad?.trim()) {
    scratchpadParts.push(input.session.scratchpad.trim());
  }
  let collectedCitations: GroundedChatCitation[] = [];
  let finalAnswer = "";
  let clarifyingQuestion: string | undefined;
  let stepCount = 0;
  let toolCallCount = 0;
  let parseRetryCount = 0;
  let retrievalTop1Score: number | undefined;
  let confidence: number | undefined;
  let usedParseHint = false;

  for (let step = 0; step < GROUNDED_CHAT_MAX_STEPS; step += 1) {
    stepCount = step + 1;
    const purpose =
      step === 0 && scratchpadParts.length === 0 ? "planner" : "planner";
    const routedModel = resolveModelForPurpose({
      purpose,
      tenantId: input.tenantId,
      defaults: {
        flashModelId: deps.vertexAiConfig.modelId,
        proModelId:
          deps.vertexAiConfig.reasoningModelId ?? deps.vertexAiConfig.modelId,
      },
    });

    const parseHint = usedParseHint
      ? `\n\n## Corrective hint\nPrevious response was invalid JSON. Reply with a single valid JSON object matching the schema.`
      : "";

    const userText = [
      buildConversationBlock(input.session, input.question),
      scratchpadParts.length > 0
        ? `## Scratchpad / tool findings\n${scratchpadParts.join("\n\n")}`
        : "",
      GROUNDED_CHAT_PLANNER_OUTPUT_INSTRUCTION + parseHint,
    ]
      .filter(Boolean)
      .join("\n\n");

    const contextBlocks =
      cacheResult.cachedContentName == null && assembled.prefixText
        ? [{ id: "grounded.prefix", content: assembled.prefixText }]
        : [];

    const isFinalSynthesisStep =
      scratchpadParts.some((p) => p.startsWith("Tool ")) && step > 0;
    const synthesisModel = isFinalSynthesisStep
      ? resolveModelForPurpose({
          purpose: "synthesis",
          tenantId: input.tenantId,
          defaults: {
            flashModelId: deps.vertexAiConfig.modelId,
            proModelId:
              deps.vertexAiConfig.reasoningModelId ??
              deps.vertexAiConfig.modelId,
          },
        })
      : routedModel;

    const result = await deps.aiController.runAiRequest({
      tenantId: input.tenantId,
      feature: "chat",
      operation: "generateText",
      requestedBy: input.userId,
      permission: "ai.chat.run",
      parentJobId: input.parentJobId,
      input: {
        question: input.question,
        sessionId: input.session?.id,
      },
      params: {
        operation: "generateText",
        systemInstruction: assembled.systemInstruction,
        userText,
        ...(contextBlocks.length > 0 ? { contextBlocks } : {}),
        outputInstruction: GROUNDED_CHAT_PLANNER_OUTPUT_INSTRUCTION,
        stepId: `groundedChat.step${stepCount}`,
        modelOptions: {
          responseMimeType: "application/json",
          maxOutputTokens: 4096,
          thinkingBudget: 256,
          modelId: synthesisModel.modelId,
          ...(cacheResult.cachedContentName
            ? { cachedContent: cacheResult.cachedContentName }
            : {}),
        },
      },
    });

    const raw =
      "text" in result.output && typeof result.output.text === "string"
        ? result.output.text
        : result.rawModelAnswer;

    let parsed;
    try {
      const json = extractJsonFromModelAnswer(raw);
      parsed = groundedChatPlannerResponseSchema.parse(json);
      usedParseHint = false;
    } catch (error) {
      scratchpadParts.push(
        `Step ${stepCount} parse error: ${
          error instanceof Error ? error.message : "invalid planner JSON"
        }`,
      );
      if (!usedParseHint) {
        usedParseHint = true;
        parseRetryCount += 1;
        step -= 1;
        continue;
      }
      if (step === GROUNDED_CHAT_MAX_STEPS - 1) {
        finalAnswer =
          "I could not produce a reliable grounded answer. Please rephrase your question.";
        confidence = 0;
        break;
      }
      continue;
    }

    if (parsed.reasoning?.trim()) {
      scratchpadParts.push(`Step ${stepCount} reasoning: ${parsed.reasoning}`);
    }

    if (parsed.action === "tool_calls" && parsed.toolCalls?.length) {
      for (const call of parsed.toolCalls) {
        toolCallCount += 1;
        const toolResult = await executeGroundedChatTool(
          deps.dataPorts,
          input.tenantId,
          input.userId,
          call,
        );
        collectedCitations = mergeCitations(
          collectedCitations,
          toolResult.citations,
        );
        if (
          toolResult.retrievalTop1Score != null &&
          (retrievalTop1Score == null ||
            toolResult.retrievalTop1Score > retrievalTop1Score)
        ) {
          retrievalTop1Score = toolResult.retrievalTop1Score;
        }
        scratchpadParts.push(
          `Tool ${call.name} (${toolResult.ok ? "ok" : "error"}): ${JSON.stringify(
            toolResult.ok ? toolResult.result : { error: toolResult.error },
          ).slice(0, 6000)}`,
        );
      }
      continue;
    }

    if (parsed.action === "clarify") {
      clarifyingQuestion =
        parsed.clarifyingQuestion?.trim() || "Could you clarify what you need?";
      finalAnswer = clarifyingQuestion;
      confidence = parsed.confidence;
      if (parsed.citations) {
        collectedCitations = mergeCitations(
          collectedCitations,
          parsed.citations,
        );
      }
      break;
    }

    // final
    finalAnswer =
      parsed.answer?.trim() ||
      "I could not find enough grounded data to answer that.";
    confidence = parsed.confidence;
    if (parsed.citations) {
      collectedCitations = mergeCitations(collectedCitations, parsed.citations);
    }
    break;
  }

  if (!finalAnswer) {
    finalAnswer =
      "I reached the tool-step limit without a complete answer. Please narrow the question.";
    confidence = confidence ?? 0;
  }

  return {
    answer: finalAnswer,
    citations: toAiChatCitations(collectedCitations),
    ...(clarifyingQuestion ? { clarifyingQuestion } : {}),
    scratchpad: traceEnabled
      ? scratchpadParts.join("\n\n").slice(0, 32_000)
      : "",
    stepCount,
    metrics: {
      stepCount,
      toolCallCount,
      cacheHit: cacheResult.cachedContentName != null,
      parseRetryCount,
      ...(retrievalTop1Score != null ? { retrievalTop1Score } : {}),
      ...(confidence != null ? { confidence } : {}),
    },
  };
}
