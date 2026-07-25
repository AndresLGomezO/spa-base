import type {
  AiEmbeddingOutput,
  AiJobModelUsage,
  AiJobOutput,
  AiJobStepTraceEntry,
  AiTextOutput,
} from "../schemas/ai-job.schema.js";
import { withEstimatedCost } from "../pricing/model-prices.js";
import {
  AiDisabledError,
  type AiControllerDeps,
  type AiRequest,
  type AiResponse,
} from "./ai-request.types.js";

const EMBEDDING_SAMPLE_SIZE = 8;

function asErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "AI request failed.";
}

async function resolveFlag(
  value: boolean | Promise<boolean>,
): Promise<boolean> {
  return value;
}

export function createAiController(deps: AiControllerDeps) {
  async function runAiRequest(
    request: AiRequest,
  ): Promise<AiResponse<AiJobOutput>> {
    const now = deps.now ?? (() => new Date());
    const enabled = await resolveFlag(deps.flags.isAiEnabled());

    if (!enabled) {
      const failed = await deps.repository.create(request.tenantId, {
        feature: request.feature,
        input: request.input,
        requestedBy: request.requestedBy,
        permission: request.permission,
        status: "failed",
        operation: request.operation,
        error: "ai.disabled",
        ...(request.parentJobId ? { parentJobId: request.parentJobId } : {}),
        ...(request.contextRef ? { contextRef: request.contextRef } : {}),
      });
      throw new AiDisabledError(`AI job ${failed.id} rejected: ai.disabled`);
    }

    if (deps.assertSpendAllowed) {
      await deps.assertSpendAllowed(request);
    }

    const job = await deps.repository.create(request.tenantId, {
      feature: request.feature,
      input: request.input,
      requestedBy: request.requestedBy,
      permission: request.permission,
      status: "running",
      operation: request.operation,
      ...(request.parentJobId ? { parentJobId: request.parentJobId } : {}),
      ...(request.contextRef ? { contextRef: request.contextRef } : {}),
    });

    const startedAt = now().getTime();
    const params = request.params;
    const stepId =
      (params.operation === "generateText" && params.stepId) ||
      `${request.feature}.${request.operation}`;

    const systemInstruction =
      params.operation === "generateText"
        ? params.systemInstruction
        : params.operation === "generateChat"
          ? "You are a helpful assistant."
          : params.operation === "generateEmbedding"
            ? "embed"
            : "image";
    const userText =
      params.operation === "generateText"
        ? params.userText
        : params.operation === "generateChat"
          ? params.question
          : params.operation === "generateEmbedding"
            ? params.text
            : params.prompt;
    const contextBlocks =
      params.operation === "generateText"
        ? [...(params.contextBlocks ?? [])]
        : [];
    const outputInstruction =
      params.operation === "generateText"
        ? (params.outputInstruction ?? "")
        : "";

    let modelUsage: AiJobModelUsage | undefined;

    try {
      let rawModelAnswer = "";
      let output: AiJobOutput;
      let embeddingVector: readonly number[] | undefined;

      if (params.operation === "generateText") {
        const modelInput = {
          systemInstruction: params.systemInstruction,
          userText: params.userText,
          ...(params.contextBlocks
            ? { contextBlocks: [...params.contextBlocks] }
            : {}),
        };
        const result =
          request.onTextChunk && deps.clients.generateModelAnswerStream
            ? await deps.clients.generateModelAnswerStream(
                deps.vertexAiConfig,
                modelInput,
                {
                  ...params.modelOptions,
                  onChunk: request.onTextChunk,
                },
              )
            : await deps.clients.generateModelAnswer(
                deps.vertexAiConfig,
                modelInput,
                params.modelOptions,
              );
        rawModelAnswer = result.text;
        modelUsage = withEstimatedCost(result.usage);
        output = { text: rawModelAnswer } satisfies AiTextOutput;
      } else if (params.operation === "generateChat") {
        const result = await deps.clients.generateChatAnswer(
          deps.vertexAiConfig,
          params.question,
        );
        rawModelAnswer = result.text;
        modelUsage = withEstimatedCost(result.usage);
        output = { answer: rawModelAnswer };
      } else if (params.operation === "generateEmbedding") {
        const result = await deps.clients.generateTextEmbedding(
          deps.vertexAiConfig,
          params.text,
        );
        embeddingVector = result.vector;
        modelUsage = withEstimatedCost(result.usage);
        const embeddingOutput: AiEmbeddingOutput = {
          dimensions: result.vector.length,
          sample: [...result.vector.slice(0, EMBEDDING_SAMPLE_SIZE)],
        };
        rawModelAnswer = JSON.stringify(embeddingOutput);
        output = embeddingOutput;
      } else {
        if (!deps.clients.generateImagenImage) {
          throw new Error("Imagen client is not configured.");
        }
        const image = await deps.clients.generateImagenImage(
          deps.vertexAiConfig,
          params.prompt,
        );
        modelUsage = withEstimatedCost(image.usage);
        rawModelAnswer = JSON.stringify({
          mimeType: image.mimeType,
          bytes: image.base64.length,
        });
        output = {
          base64: image.base64,
          mimeType: image.mimeType,
        };
      }

      const durationMs = Math.max(0, now().getTime() - startedAt);
      const entry: AiJobStepTraceEntry = {
        stepId,
        attempt: 0,
        systemInstruction,
        contextBlocks,
        userText,
        outputInstruction,
        rawModelAnswer,
        validationOk: true,
        durationMs,
        parsedJson:
          params.operation === "generateEmbedding" ||
          params.operation === "generateImage"
            ? output
            : undefined,
        ...(modelUsage ? { modelUsage } : {}),
      };

      const traceEnabled = await resolveFlag(deps.flags.isAiTraceEnabled());
      if (traceEnabled) {
        await deps.repository.appendStepTrace(request.tenantId, job.id, entry);
      }

      await deps.repository.update(request.tenantId, job.id, {
        status: "completed",
        output,
        error: null,
        ...(modelUsage ? { modelUsage } : {}),
      });

      if (modelUsage && deps.recordSpendUsage) {
        try {
          await deps.recordSpendUsage({
            tenantId: request.tenantId,
            requestedBy: request.requestedBy,
            modelUsage,
          });
        } catch {
          // Spend ledger failures must not fail the completed AI job.
        }
      }

      return {
        jobId: job.id,
        output,
        rawModelAnswer,
        durationMs,
        ...(modelUsage ? { modelUsage } : {}),
        ...(embeddingVector ? { embeddingVector } : {}),
      };
    } catch (error) {
      const durationMs = Math.max(0, now().getTime() - startedAt);
      const message = asErrorMessage(error);
      const entry: AiJobStepTraceEntry = {
        stepId,
        attempt: 0,
        systemInstruction,
        contextBlocks,
        userText,
        outputInstruction,
        rawModelAnswer: "",
        validationOk: false,
        validationErrors: [message],
        durationMs,
        ...(modelUsage ? { modelUsage } : {}),
      };

      try {
        const traceEnabled = await resolveFlag(deps.flags.isAiTraceEnabled());
        if (traceEnabled) {
          await deps.repository.appendStepTrace(
            request.tenantId,
            job.id,
            entry,
          );
        }
        await deps.repository.update(request.tenantId, job.id, {
          status: "failed",
          error: message,
          ...(modelUsage ? { modelUsage } : {}),
        });
      } catch {
        // Persistence failures must not mask the original AI error.
      }

      throw error;
    }
  }

  return { runAiRequest };
}

export type AiController = ReturnType<typeof createAiController>;
