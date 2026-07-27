import type {
  AiChatSessionRecord,
  TenantAiContextRepository,
  UserAiMemoryRepository,
} from "@repo/ai-context";
import { extractJsonFromModelAnswer } from "../extract-json-from-model-answer.js";
import type { AiController } from "../controller/index.js";
import type { AiChatOutput, AiJobProgress } from "../schemas/ai-job.schema.js";
import type { VertexAiConfig } from "../vertex-ai.client.js";
import { resolveModelForPurpose } from "../model-router.js";

import { assembleGroundedChatPrefix } from "./assemble-prefix.js";
import {
  GROUNDED_CHAT_MAX_STEPS,
  GROUNDED_CHAT_PLANNER_OUTPUT_INSTRUCTION,
  GROUNDED_CHAT_SYNTHESIS_INSTRUCTION,
  groundedChatPlannerResponseSchema,
  selectRelevantCitations,
  type GroundedChatCitation,
  type GroundedChatToolCall,
} from "./constants.js";
import { ensureVertexCacheForUserMemory } from "./ensure-vertex-cache.js";
import {
  executeGroundedChatTool,
  mergeCitations,
  toAiChatCitations,
  type GroundedChatDataPorts,
} from "./tools.js";
import { normalizeGroundedChatAnswerLinks } from "./record-ref.js";
import type { VertexCachedContentClient } from "./vertex-cached-content.js";

export interface RunGroundedChatOrchestratorInput {
  readonly tenantId: string;
  readonly userId: string;
  readonly question: string;
  readonly parentJobId: string;
  readonly session?: AiChatSessionRecord | null;
}

export interface GroundedChatOrchestratorCallbacks {
  readonly onProgress?: (progress: AiJobProgress) => void | Promise<void>;
  readonly onPartialAnswer?: (textSoFar: string) => void | Promise<void>;
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
  readonly callbacks?: GroundedChatOrchestratorCallbacks;
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

const STEP_LIMIT_MESSAGE =
  "I reached the tool-step limit without a complete answer. Please narrow the question.";

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

function hasSuccessfulToolFindings(
  scratchpadParts: readonly string[],
): boolean {
  return scratchpadParts.some(
    (part) => part.startsWith("Tool ") && part.includes("(ok)"),
  );
}

function progressLabelForTool(call: GroundedChatToolCall): string {
  const entityName =
    typeof call.args.entityName === "string" ? call.args.entityName.trim() : "";
  switch (call.name) {
    case "listEntities":
      return "Searching catalog…";
    case "listMetrics":
      return "Listing metrics…";
    case "listQueries":
      return "Listing saved queries…";
    case "semanticSearchRecords":
    case "keywordSearchRecords":
    case "searchRecords":
      return entityName ? `Searching ${entityName}…` : "Searching records…";
    case "getRecord":
      return entityName ? `Reading ${entityName}…` : "Reading record…";
    case "getUserMemoryFacts":
      return "Reading memory…";
    case "runSavedQuery":
      return "Running saved query…";
    case "runMetric":
      return "Running metric…";
    case "getInsights":
      return "Reading insights…";
    default:
      return "Working…";
  }
}

function createChunkThrottle(
  onPartialAnswer: ((textSoFar: string) => void | Promise<void>) | undefined,
  minIntervalMs = 100,
): (textSoFar: string) => Promise<void> {
  let lastEmitAt = 0;
  let pending: string | null = null;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = async () => {
    flushTimer = null;
    if (!onPartialAnswer || pending == null) return;
    const text = pending;
    pending = null;
    lastEmitAt = Date.now();
    await onPartialAnswer(text);
  };

  return async (textSoFar: string) => {
    if (!onPartialAnswer) return;
    pending = textSoFar;
    const elapsed = Date.now() - lastEmitAt;
    if (elapsed >= minIntervalMs) {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      await flush();
      return;
    }
    if (!flushTimer) {
      flushTimer = setTimeout(() => {
        void flush();
      }, minIntervalMs - elapsed);
    }
  };
}

export async function runGroundedChatOrchestrator(
  deps: RunGroundedChatOrchestratorDeps,
  input: RunGroundedChatOrchestratorInput,
): Promise<GroundedChatOrchestratorResult> {
  const traceEnabled = deps.isAiTraceEnabled
    ? Boolean(await deps.isAiTraceEnabled())
    : false;
  const callbacks = deps.callbacks;

  const emitProgress = async (
    stepIndex: number,
    stepId: string,
    stepLabel: string,
    phase: string,
  ) => {
    await callbacks?.onProgress?.({
      stepIndex,
      totalSteps: GROUNDED_CHAT_MAX_STEPS,
      stepId,
      stepLabel,
      phase,
    });
  };

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
  let toolCitations: GroundedChatCitation[] = [];
  let finalAnswer = "";
  let clarifyingQuestion: string | undefined;
  let stepCount = 0;
  let toolCallCount = 0;
  let parseRetryCount = 0;
  let retrievalTop1Score: number | undefined;
  let confidence: number | undefined;
  let usedParseHint = false;
  let toolsSucceeded = false;
  let needsSynthesis = false;

  await emitProgress(0, "groundedChat.plan", "Thinking…", "planning");

  for (let step = 0; step < GROUNDED_CHAT_MAX_STEPS; step += 1) {
    stepCount = step + 1;
    const routedModel = resolveModelForPurpose({
      purpose: "planner",
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

    await emitProgress(
      step,
      `groundedChat.step${stepCount}`,
      "Planning next step…",
      "planning",
    );

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
          modelId: routedModel.modelId,
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
        if (hasSuccessfulToolFindings(scratchpadParts)) {
          toolsSucceeded = true;
          needsSynthesis = true;
        } else {
          finalAnswer =
            "I could not produce a reliable grounded answer. Please rephrase your question.";
          confidence = 0;
        }
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
        await emitProgress(
          step,
          `groundedChat.tool.${call.name}`,
          progressLabelForTool(call),
          "tools",
        );
        const toolResult = await executeGroundedChatTool(
          deps.dataPorts,
          input.tenantId,
          input.userId,
          call,
        );
        if (toolResult.ok) {
          toolsSucceeded = true;
        }
        toolCitations = mergeCitations(toolCitations, toolResult.citations);
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
      break;
    }

    // final
    confidence = parsed.confidence;
    if (toolsSucceeded || hasSuccessfulToolFindings(scratchpadParts)) {
      needsSynthesis = true;
      if (parsed.answer?.trim()) {
        scratchpadParts.push(
          `Planner draft answer: ${parsed.answer.trim().slice(0, 4000)}`,
        );
      }
    } else {
      finalAnswer =
        parsed.answer?.trim() ||
        "I could not find enough grounded data to answer that.";
      if (callbacks?.onPartialAnswer && finalAnswer) {
        await callbacks.onPartialAnswer(finalAnswer);
      }
    }
    break;
  }

  if (!finalAnswer && !needsSynthesis) {
    if (toolsSucceeded || hasSuccessfulToolFindings(scratchpadParts)) {
      needsSynthesis = true;
    } else {
      finalAnswer = STEP_LIMIT_MESSAGE;
      confidence = confidence ?? 0;
    }
  }

  if (needsSynthesis && !finalAnswer) {
    await emitProgress(
      Math.max(0, stepCount - 1),
      "groundedChat.synthesis",
      "Writing answer…",
      "synthesis",
    );
    finalAnswer = await synthesizeGroundedAnswer(deps, input, {
      systemInstruction: assembled.systemInstruction,
      scratchpadParts,
      cachedContentName: cacheResult.cachedContentName,
      prefixText: assembled.prefixText,
      toolCitations,
      onPartialAnswer: callbacks?.onPartialAnswer,
    });
    confidence = confidence ?? 0.6;
  }

  finalAnswer = normalizeGroundedChatAnswerLinks(finalAnswer, toolCitations);
  if (callbacks?.onPartialAnswer && finalAnswer) {
    await callbacks.onPartialAnswer(finalAnswer);
  }

  const filteredCitations = selectRelevantCitations(toolCitations, finalAnswer);

  return {
    answer: finalAnswer,
    citations: toAiChatCitations(filteredCitations),
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

async function synthesizeGroundedAnswer(
  deps: RunGroundedChatOrchestratorDeps,
  input: RunGroundedChatOrchestratorInput,
  options: {
    readonly systemInstruction: string;
    readonly scratchpadParts: readonly string[];
    readonly cachedContentName: string | null;
    readonly prefixText: string;
    readonly toolCitations: readonly GroundedChatCitation[];
    readonly onPartialAnswer?: (textSoFar: string) => void | Promise<void>;
  },
): Promise<string> {
  const synthesisModel = resolveModelForPurpose({
    purpose: "synthesis",
    tenantId: input.tenantId,
    defaults: {
      flashModelId: deps.vertexAiConfig.modelId,
      proModelId:
        deps.vertexAiConfig.reasoningModelId ?? deps.vertexAiConfig.modelId,
    },
  });

  const contextBlocks =
    options.cachedContentName == null && options.prefixText
      ? [{ id: "grounded.prefix", content: options.prefixText }]
      : [];

  const userText = [
    buildConversationBlock(input.session, input.question),
    `## Scratchpad / tool findings\n${options.scratchpadParts.join("\n\n")}`,
    GROUNDED_CHAT_SYNTHESIS_INSTRUCTION,
  ].join("\n\n");

  const emitPartial = options.onPartialAnswer
    ? async (textSoFar: string) => {
        await options.onPartialAnswer!(
          normalizeGroundedChatAnswerLinks(textSoFar, options.toolCitations),
        );
      }
    : undefined;

  const onChunk = createChunkThrottle(emitPartial);

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
    onTextChunk: onChunk,
    params: {
      operation: "generateText",
      systemInstruction: options.systemInstruction,
      userText,
      ...(contextBlocks.length > 0 ? { contextBlocks } : {}),
      outputInstruction: GROUNDED_CHAT_SYNTHESIS_INSTRUCTION,
      stepId: "groundedChat.synthesis",
      modelOptions: {
        responseMimeType: "text/plain",
        maxOutputTokens: 4096,
        thinkingBudget: 128,
        modelId: synthesisModel.modelId,
        ...(options.cachedContentName
          ? { cachedContent: options.cachedContentName }
          : {}),
      },
    },
  });

  const text =
    "text" in result.output && typeof result.output.text === "string"
      ? result.output.text.trim()
      : result.rawModelAnswer.trim();

  const rewritten = normalizeGroundedChatAnswerLinks(
    text,
    options.toolCitations,
  );
  if (options.onPartialAnswer && rewritten) {
    await options.onPartialAnswer(rewritten);
  }

  return rewritten || "I could not find enough grounded data to answer that.";
}
