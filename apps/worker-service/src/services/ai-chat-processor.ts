import type { AiJobRepository } from "@repo/worker-firestore";
import { AI_FEATURE_RUN_PERMISSION } from "@repo/ai-engine/permissions";
import { processAiChatTaskPayloadSchema } from "@repo/ai-engine/schemas";

import { processAiChat, type VertexAiConfig } from "../process-ai-chat.js";

export interface AiChatProcessorDeps {
  readonly aiJobRepository: AiJobRepository;
  readonly vertexAiConfig: VertexAiConfig;
}

export async function processAiChatJob(
  deps: AiChatProcessorDeps,
  tenantId: string,
  jobId: string,
): Promise<void> {
  const job = await deps.aiJobRepository.getById(tenantId, jobId);
  if (!job) {
    throw new PermanentTaskError("JOB_NOT_FOUND");
  }

  if (job.feature !== "chat") {
    throw new PermanentTaskError("INVALID_FEATURE");
  }

  if (job.permission !== AI_FEATURE_RUN_PERMISSION.chat) {
    throw new PermanentTaskError("INVALID_PERMISSION");
  }

  if (job.status === "completed" || job.status === "failed") {
    return;
  }

  await deps.aiJobRepository.update(tenantId, jobId, { status: "running" });

  try {
    const output = await processAiChat(deps.vertexAiConfig, job.input);
    await deps.aiJobRepository.update(tenantId, jobId, {
      status: "completed",
      output,
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI chat processing failed.";
    await deps.aiJobRepository.update(tenantId, jobId, {
      status: "failed",
      output: null,
      error: message,
    });
    throw new PermanentTaskError("PROCESSING_FAILED");
  }
}

export class PermanentTaskError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "PermanentTaskError";
  }
}

export { processAiChatTaskPayloadSchema };
