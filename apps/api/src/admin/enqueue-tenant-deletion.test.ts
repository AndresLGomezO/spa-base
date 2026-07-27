import { describe, expect, it, vi } from "vitest";

import {
  createInMemoryTenantDeletionArchiveRepository,
  createInMemoryTenantDeletionJobRepository,
} from "@repo/firestore-converters";

import { createInMemoryTenantRepository } from "../test/mock-tenant-repository.js";
import {
  enqueueTenantDeletion,
  TenantDeletionRequestError,
  parseProtectedTenantIds,
} from "./enqueue-tenant-deletion.js";

describe("parseProtectedTenantIds", () => {
  it("parses comma-separated tenant ids", () => {
    expect(parseProtectedTenantIds("tenant_a, demo")).toEqual([
      "tenant_a",
      "demo",
    ]);
  });
});

describe("enqueueTenantDeletion", () => {
  it("rejects confirmation mismatch", async () => {
    const tenantRepository = createInMemoryTenantRepository();
    await expect(
      enqueueTenantDeletion(
        {
          tenantRepository,
          jobRepository: createInMemoryTenantDeletionJobRepository(),
          archiveRepository: createInMemoryTenantDeletionArchiveRepository(),
          tenantDeletionTasksClient: {
            enqueueTenantDeletionTask: vi.fn(),
          },
          protectedTenantIds: [],
        },
        {
          tenantId: "tenant_a",
          confirmTenantId: "tenant_b",
          deletedBy: "superadmin",
        },
      ),
    ).rejects.toBeInstanceOf(TenantDeletionRequestError);
  });

  it("rejects protected tenants", async () => {
    const tenantRepository = createInMemoryTenantRepository();
    await expect(
      enqueueTenantDeletion(
        {
          tenantRepository,
          jobRepository: createInMemoryTenantDeletionJobRepository(),
          archiveRepository: createInMemoryTenantDeletionArchiveRepository(),
          tenantDeletionTasksClient: {
            enqueueTenantDeletionTask: vi.fn(),
          },
          protectedTenantIds: ["tenant_a"],
        },
        {
          tenantId: "tenant_a",
          confirmTenantId: "tenant_a",
          deletedBy: "superadmin",
        },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("creates job, archive, suspends tenant, and enqueues task", async () => {
    const tenantRepository = createInMemoryTenantRepository();
    const jobRepository = createInMemoryTenantDeletionJobRepository();
    const archiveRepository = createInMemoryTenantDeletionArchiveRepository();
    const enqueueTenantDeletionTask = vi.fn(async () => undefined);

    const result = await enqueueTenantDeletion(
      {
        tenantRepository,
        jobRepository,
        archiveRepository,
        tenantDeletionTasksClient: { enqueueTenantDeletionTask },
        protectedTenantIds: [],
      },
      {
        tenantId: "tenant_a",
        confirmTenantId: "tenant_a",
        deletedBy: "superadmin",
      },
    );

    expect(result.jobId).toMatch(/^tdjob_/);
    expect(result.archiveId).toMatch(/^tdarch_/);
    expect(enqueueTenantDeletionTask).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant_a",
        jobId: result.jobId,
        archiveId: result.archiveId,
      }),
    );

    const tenant = await tenantRepository.getById("tenant_a");
    expect(tenant?.status).toBe("suspended");

    const job = await jobRepository.getById(result.jobId);
    expect(job?.status).toBe("queued");

    const archive = await archiveRepository.getById(result.archiveId);
    expect(archive?.status).toBe("archiving");
    expect(archive?.sourceTenantId).toBe("tenant_a");
  });
});
