import { computeTenantDeletionPurgeAfter } from "@repo/shared-types";
import type {
  TenantDeletionArchiveRepository,
  TenantDeletionJobRepository,
  TenantRepository,
} from "@repo/firestore-converters";

import type { createTenantDeletionTasksClient } from "./tenant-deletion-tasks.client.js";

interface EnqueueTenantDeletionDeps {
  readonly tenantRepository: TenantRepository;
  readonly jobRepository: TenantDeletionJobRepository;
  readonly archiveRepository: TenantDeletionArchiveRepository;
  readonly tenantDeletionTasksClient: ReturnType<
    typeof createTenantDeletionTasksClient
  >;
  readonly protectedTenantIds: readonly string[];
}

interface EnqueueTenantDeletionInput {
  readonly tenantId: string;
  readonly confirmTenantId: string;
  readonly deletedBy: string | null;
}

interface EnqueueTenantDeletionResult {
  readonly jobId: string;
  readonly archiveId: string;
}

export async function enqueueTenantDeletion(
  deps: EnqueueTenantDeletionDeps,
  input: EnqueueTenantDeletionInput,
): Promise<EnqueueTenantDeletionResult> {
  const tenantId = input.tenantId.trim();
  const confirmTenantId = input.confirmTenantId.trim();

  if (!tenantId) {
    throw new TenantDeletionRequestError("Tenant id is required.", 400);
  }

  if (confirmTenantId !== tenantId) {
    throw new TenantDeletionRequestError(
      "Confirmation tenant id does not match.",
      400,
    );
  }

  if (deps.protectedTenantIds.includes(tenantId)) {
    throw new TenantDeletionRequestError(
      "This tenant is protected and cannot be deleted.",
      403,
    );
  }

  const tenant = await deps.tenantRepository.getById(tenantId);
  if (!tenant) {
    throw new TenantDeletionRequestError("Tenant not found.", 404);
  }

  const activeJob = await deps.jobRepository.findActiveByTenantId(tenantId);
  if (activeJob) {
    throw new TenantDeletionRequestError(
      "A tenant deletion job is already in progress.",
      409,
    );
  }

  const deletedAt = new Date();
  const archive = await deps.archiveRepository.create({
    sourceTenantId: tenant.id,
    sourceTenantName: tenant.name,
    deletedBy: input.deletedBy,
    tenantSnapshot: tenant,
    deletedAt: deletedAt.toISOString(),
    purgeAfter: computeTenantDeletionPurgeAfter(deletedAt),
  });

  const job = await deps.jobRepository.create({
    tenantId: tenant.id,
    archiveId: archive.id,
    deletedBy: input.deletedBy,
  });

  await deps.tenantRepository.update(tenant.id, { status: "suspended" });

  await deps.tenantDeletionTasksClient.enqueueTenantDeletionTask({
    jobId: job.id,
    tenantId: tenant.id,
    archiveId: archive.id,
    deletedBy: input.deletedBy,
  });

  return {
    jobId: job.id,
    archiveId: archive.id,
  };
}

export class TenantDeletionRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 403 | 404 | 409,
  ) {
    super(message);
    this.name = "TenantDeletionRequestError";
  }
}

export function parseProtectedTenantIds(raw: string): readonly string[] {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}
