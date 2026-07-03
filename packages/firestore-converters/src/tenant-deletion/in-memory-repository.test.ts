import { describe, expect, it } from "vitest";

import {
  createInMemoryTenantDeletionArchiveRepository,
  createInMemoryTenantDeletionJobRepository,
} from "@repo/firestore-converters";
import { computeTenantDeletionPurgeAfter } from "@repo/shared-types";

describe("tenant deletion in-memory repositories", () => {
  it("tracks active jobs per tenant", async () => {
    const jobRepository = createInMemoryTenantDeletionJobRepository();
    const job = await jobRepository.create({
      tenantId: "tenant_a",
      archiveId: "archive_1",
      deletedBy: "superadmin",
    });

    const active = await jobRepository.findActiveByTenantId("tenant_a");
    expect(active?.id).toBe(job.id);

    await jobRepository.update(job.id, { status: "completed" });
    const inactive = await jobRepository.findActiveByTenantId("tenant_a");
    expect(inactive).toBeNull();
  });

  it("lists archives ready for purge", async () => {
    const archiveRepository = createInMemoryTenantDeletionArchiveRepository();
    const deletedAt = new Date("2026-01-01T00:00:00.000Z");
    const archive = await archiveRepository.create({
      sourceTenantId: "tenant_a",
      sourceTenantName: "Tenant A",
      deletedBy: "superadmin",
      deletedAt: deletedAt.toISOString(),
      purgeAfter: computeTenantDeletionPurgeAfter(deletedAt, 30),
      tenantSnapshot: {
        id: "tenant_a",
        name: "Tenant A",
        status: "active",
        createdBy: null,
        createdAt: deletedAt.toISOString(),
        updatedAt: deletedAt.toISOString(),
      },
    });

    await archiveRepository.update(archive.id, { status: "archived" });

    const notReady = await archiveRepository.listReadyForPurge(
      "2026-01-15T00:00:00.000Z",
    );
    expect(notReady).toHaveLength(0);

    const ready = await archiveRepository.listReadyForPurge(
      "2026-02-15T00:00:00.000Z",
    );
    expect(ready.map((item) => item.id)).toEqual([archive.id]);
  });
});

describe("computeTenantDeletionPurgeAfter", () => {
  it("adds 30 days by default", () => {
    const deletedAt = new Date("2026-01-01T00:00:00.000Z");
    expect(computeTenantDeletionPurgeAfter(deletedAt)).toBe(
      "2026-01-31T00:00:00.000Z",
    );
  });
});
