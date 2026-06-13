import { extractJsonFromModelAnswer } from "../extract-json-from-model-answer.js";
import {
  generateModelAnswer,
  type GenerateModelAnswerOptions,
  type VertexAiConfig,
} from "../vertex-ai.client.js";
import {
  getStepMaxOutputTokens,
  MAX_STEP_RETRIES,
  TRUNCATED_RESPONSE_ERROR,
} from "./limits.js";
import type { StepContextInput, StepValidationResult } from "./types.js";

export interface RunStepOptions {
  readonly vertexConfig: VertexAiConfig;
  readonly stepContext: StepContextInput;
  readonly stepId: string;
}

function isTruncatedResponseError(error: unknown): boolean {
  return (
    error instanceof Error && error.message.includes(TRUNCATED_RESPONSE_ERROR)
  );
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
    const retryHint =
      retryParts.length > 0
        ? `\n\n${retryParts.join("\n\n")}\nFix these issues and return valid JSON only.`
        : "";

    let rawAnswer: string;
    try {
      rawAnswer = await generateModelAnswer(
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
    } catch (error) {
      if (isTruncatedResponseError(error)) {
        lastErrors = [TRUNCATED_RESPONSE_ERROR];
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
      continue;
    }

    const result = validate(parsed);
    if (result.ok) {
      return result;
    }
    lastErrors = result.errors;
  }

  throw new Error(
    `Step ${options.stepId} failed after ${MAX_STEP_RETRIES + 1} attempts: ${lastErrors.join("; ")}`,
  );
}
