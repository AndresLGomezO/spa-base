import type { AiJobRepository } from "@repo/worker-firestore";

export async function markAiJobFailedIfExists(
  repository: AiJobRepository,
  tenantId: string,
  jobId: string,
  errorCode: string,
): Promise<void> {
  try {
    const job = await repository.getById(tenantId, jobId);
    if (!job) {
      return;
    }
    if (job.status === "completed" || job.status === "failed") {
      return;
    }

    await repository.update(tenantId, jobId, {
      status: "failed",
      error: errorCode,
      output: null,
    });
  } catch {
    // Best-effort — task handler still returns permanent failure to dispatcher.
  }
}
