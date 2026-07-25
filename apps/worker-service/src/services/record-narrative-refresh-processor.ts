import {
  upsertAiRecordNarrative,
  isAiRecordNarrativeStale,
} from "@repo/ai-context";
import type { AiController } from "@repo/ai-engine/controller";
import { extractJsonFromModelAnswer } from "@repo/ai-engine/extract-json-from-model-answer";
import {
  DATA_HOOK_AI_NARRATIVE_MAX_OUTPUT_TOKENS,
  DATA_HOOK_AI_NARRATIVE_THINKING_BUDGET,
} from "@repo/ai-engine/vertex-ai.client";
import type { AiRecordSummaryRepository } from "@repo/firestore-converters";

import { expandNarrativeCharts } from "../hooks/expand-narrative-charts.js";

export interface RecordNarrativeRefreshInput {
  readonly tenantId: string;
  readonly entityName: string;
  readonly recordId: string;
  readonly variant?: string;
  readonly prompt?: string;
  readonly systemInstruction?: string;
}

export type RecordNarrativeRefreshProcessor = (
  input: RecordNarrativeRefreshInput,
) => Promise<void>;

export interface RecordNarrativeRefreshProcessorDeps {
  readonly aiRecordSummaryRepository: AiRecordSummaryRepository;
  readonly aiController: AiController;
  /** Prefer reasoning / Pro model when set (same as legacy callAi narratives). */
  readonly reasoningModelId?: string;
}

const DEFAULT_SYSTEM = `You are a precise data-grounded analyst. Reply with ONE valid JSON object and nothing else:
{"text":"<markdown summary>","charts":[...]}

CHART SYSTEM
- Charts live ONLY in "charts". Never fence a chart block inside "text".
- Reference charts with placeholders in "text": {{chart:0}}, {{chart:1}}, ...
- Allowed kinds: progress | bar | pie | sparkline
- Include charts when the data snapshot supports them; omit rather than invent.

Use the provided context snapshot. No advice. No tautologies.`;

function buildUserPrompt(
  input: RecordNarrativeRefreshInput,
  contextJson: string,
): string {
  const roleOrObjective =
    input.prompt?.trim() ||
    `Write a structured markdown summary for this ${input.entityName} record.`;
  return `${roleOrObjective}\n\n**Data:**\n${contextJson}`;
}

export function createRecordNarrativeRefreshProcessor(
  deps: RecordNarrativeRefreshProcessorDeps,
): RecordNarrativeRefreshProcessor {
  return async (input) => {
    const variant = input.variant?.trim() || "default";
    const summary = await deps.aiRecordSummaryRepository.get(
      input.tenantId,
      input.entityName,
      input.recordId,
    );
    if (!summary?.context || !summary.contextHash) {
      // Scheduled catch-up may run before context writers; skip quietly.
      return;
    }

    if (!isAiRecordNarrativeStale(summary, variant)) {
      return;
    }

    const expectedSourceHash =
      summary.variantContextHashes?.[variant]?.trim() || summary.contextHash;

    const contextJson = JSON.stringify(summary.context);
    const userPrompt = buildUserPrompt(input, contextJson);
    const systemInstruction = input.systemInstruction?.trim() || DEFAULT_SYSTEM;

    const result = await deps.aiController.runAiRequest({
      tenantId: input.tenantId,
      feature: "recordNarrativeRefresh",
      operation: "generateText",
      requestedBy: "system",
      permission: "ai.dataHook.run",
      input: {
        kind: "recordNarrativeRefresh",
        entityName: input.entityName,
        recordId: input.recordId,
        variant,
        prompt: userPrompt,
        systemInstruction,
      },
      params: {
        operation: "generateText",
        systemInstruction,
        userText: userPrompt,
        modelOptions: {
          maxOutputTokens: DATA_HOOK_AI_NARRATIVE_MAX_OUTPUT_TOKENS,
          thinkingBudget: DATA_HOOK_AI_NARRATIVE_THINKING_BUDGET,
          responseMimeType: "application/json",
          ...(deps.reasoningModelId?.trim()
            ? { modelId: deps.reasoningModelId.trim() }
            : {}),
        },
      },
    });

    const outputText =
      result.output &&
      typeof result.output === "object" &&
      "text" in result.output &&
      typeof result.output.text === "string"
        ? result.output.text.trim()
        : "";
    const rawText = result.rawModelAnswer?.trim() || outputText;
    if (!rawText) {
      throw new Error("recordNarrativeRefresh returned empty text.");
    }

    let narrativeText = rawText;
    try {
      const parsed = extractJsonFromModelAnswer(rawText);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const expanded = expandNarrativeCharts(
          parsed as Record<string, unknown>,
        );
        if (typeof expanded.text === "string" && expanded.text.trim()) {
          narrativeText = expanded.text.trim();
        }
      }
    } catch {
      // Keep raw text when the model returned markdown instead of JSON.
    }

    await upsertAiRecordNarrative(deps.aiRecordSummaryRepository, {
      tenantId: input.tenantId,
      entityName: input.entityName,
      recordId: input.recordId,
      variant,
      text: narrativeText,
      sourceHash: expectedSourceHash,
    });
  };
}
