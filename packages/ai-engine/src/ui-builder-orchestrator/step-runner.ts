import { extractJsonFromModelAnswer } from "../extract-json-from-model-answer.js";
import type { AiJobStepTraceEntry } from "../schemas/ai-job.schema.js";
import type {
  GenerateModelAnswerOptions,
  VertexAiConfig,
} from "../vertex-ai.client.js";
import { generateModelAnswer } from "../clients/internal/vertex-ai.client.js";
import {
  getStepMaxOutputTokens,
  MAX_STEP_RETRIES,
  TRUNCATED_RESPONSE_ERROR,
} from "./limits.js";
import type { StepContextInput, StepValidationResult } from "./types.js";

export type GenerateAnswerFn = (
  config: VertexAiConfig,
  input: {
    readonly systemInstruction: string;
    readonly userText: string;
    readonly contextBlocks?: readonly {
      readonly id: string;
      readonly content: string;
    }[];
  },
  options?: GenerateModelAnswerOptions,
) => Promise<string>;

export interface RunStepOptions {
  readonly vertexConfig: VertexAiConfig;
  readonly stepContext: StepContextInput;
  readonly stepId: string;
  readonly draftBeforeStep?: unknown;
  readonly onAttempt?: (entry: AiJobStepTraceEntry) => void | Promise<void>;
  /** When set, used instead of the raw Vertex client (unified AI controller). */
  readonly generateAnswer?: GenerateAnswerFn;
}

function isTruncatedResponseError(error: unknown): boolean {
  return (
    error instanceof Error && error.message.includes(TRUNCATED_RESPONSE_ERROR)
  );
}

async function recordAttempt(
  options: RunStepOptions,
  entry: AiJobStepTraceEntry,
): Promise<void> {
  if (options.onAttempt) {
    await options.onAttempt(entry);
  }
}

export async function runStepWithRetries(
  options: RunStepOptions,
  validate: (raw: unknown) => StepValidationResult,
): Promise<Extract<StepValidationResult, { ok: true }>> {
  let lastErrors: readonly string[] = [];

  for (let attempt = 0; attempt <= MAX_STEP_RETRIES; attempt++) {
    const retryParts: string[] = [];
    if (attempt > 0 && lastErrors.length > 0) {
      retryParts.push(
        `Previous attempt failed validation:\n${lastErrors.map((error) => `- ${error}`).join("\n")}`,
      );
    }
    if (lastErrors.some((error) => error.includes("truncated"))) {
      retryParts.push(
        "Your last response was truncated. Return the smallest valid JSON object only — no comments, no extra keys, no pretty-print padding.",
      );
    }
    if (
      lastErrors.some(
        (error) =>
          error.includes("JSON") ||
          error.includes("Unexpected token") ||
          error.includes("Expected ','") ||
          error.includes("Expected '}'"),
      )
    ) {
      retryParts.push(
        "Your last response was invalid JSON. Return ONE minimal valid JSON object only — no markdown fences, no trailing commas, no comments, and no styles/conditionalStyles arrays unless required.",
      );
    }
    const retryHint =
      retryParts.length > 0
        ? `\n\n${retryParts.join("\n\n")}\nFix these issues and return valid JSON only.`
        : "";

    const startedAt = Date.now();
    let rawAnswer = "";

    try {
      if (options.generateAnswer) {
        rawAnswer = await options.generateAnswer(
          options.vertexConfig,
          {
            systemInstruction: options.stepContext.systemInstruction,
            contextBlocks: options.stepContext.contextBlocks,
            userText: `${options.stepContext.userText}\n\n${options.stepContext.outputInstruction}${retryHint}`,
          },
          {
            maxOutputTokens: getStepMaxOutputTokens(options.stepId),
            responseMimeType: "application/json",
            stepId: options.stepId,
          } satisfies GenerateModelAnswerOptions,
        );
      } else {
        const result = await generateModelAnswer(
          options.vertexConfig,
          {
            systemInstruction: options.stepContext.systemInstruction,
            contextBlocks: options.stepContext.contextBlocks,
            userText: `${options.stepContext.userText}\n\n${options.stepContext.outputInstruction}${retryHint}`,
          },
          {
            maxOutputTokens: getStepMaxOutputTokens(options.stepId),
            responseMimeType: "application/json",
            stepId: options.stepId,
          } satisfies GenerateModelAnswerOptions,
        );
        rawAnswer = result.text;
      }
    } catch (error) {
      if (isTruncatedResponseError(error)) {
        lastErrors = [TRUNCATED_RESPONSE_ERROR];
        await recordAttempt(options, {
          stepId: options.stepId,
          attempt,
          systemInstruction: options.stepContext.systemInstruction,
          contextBlocks: [...options.stepContext.contextBlocks],
          userText: options.stepContext.userText,
          outputInstruction: options.stepContext.outputInstruction,
          ...(retryHint ? { retryHint } : {}),
          rawModelAnswer: "",
          validationErrors: [...lastErrors],
          validationOk: false,
          durationMs: Date.now() - startedAt,
          ...(options.draftBeforeStep !== undefined
            ? { draftBeforeStep: options.draftBeforeStep }
            : {}),
        });
        continue;
      }
      throw error;
    }

    let parsed: unknown;
    try {
      parsed = extractJsonFromModelAnswer(rawAnswer);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to parse JSON response.";
      lastErrors = [message];
      await recordAttempt(options, {
        stepId: options.stepId,
        attempt,
        systemInstruction: options.stepContext.systemInstruction,
        contextBlocks: [...options.stepContext.contextBlocks],
        userText: options.stepContext.userText,
        outputInstruction: options.stepContext.outputInstruction,
        ...(retryHint ? { retryHint } : {}),
        rawModelAnswer: rawAnswer,
        validationErrors: [...lastErrors],
        validationOk: false,
        durationMs: Date.now() - startedAt,
        ...(options.draftBeforeStep !== undefined
          ? { draftBeforeStep: options.draftBeforeStep }
          : {}),
      });
      continue;
    }

    const result = validate(parsed);
    if (result.ok) {
      await recordAttempt(options, {
        stepId: options.stepId,
        attempt,
        systemInstruction: options.stepContext.systemInstruction,
        contextBlocks: [...options.stepContext.contextBlocks],
        userText: options.stepContext.userText,
        outputInstruction: options.stepContext.outputInstruction,
        ...(retryHint ? { retryHint } : {}),
        rawModelAnswer: rawAnswer,
        parsedJson: parsed,
        validationOk: true,
        durationMs: Date.now() - startedAt,
        ...(options.draftBeforeStep !== undefined
          ? { draftBeforeStep: options.draftBeforeStep }
          : {}),
      });
      return result;
    }

    lastErrors = result.errors;
    await recordAttempt(options, {
      stepId: options.stepId,
      attempt,
      systemInstruction: options.stepContext.systemInstruction,
      contextBlocks: [...options.stepContext.contextBlocks],
      userText: options.stepContext.userText,
      outputInstruction: options.stepContext.outputInstruction,
      ...(retryHint ? { retryHint } : {}),
      rawModelAnswer: rawAnswer,
      parsedJson: parsed,
      validationErrors: [...result.errors],
      validationOk: false,
      durationMs: Date.now() - startedAt,
      ...(options.draftBeforeStep !== undefined
        ? { draftBeforeStep: options.draftBeforeStep }
        : {}),
    });
  }

  throw new Error(
    `Step ${options.stepId} failed after ${MAX_STEP_RETRIES + 1} attempts: ${lastErrors.join("; ")}`,
  );
}
