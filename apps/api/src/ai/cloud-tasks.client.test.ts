import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createCloudTasksClient } from "./cloud-tasks.client.js";

describe("cloud-tasks.client lineage headers", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    fetchSpy = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    globalThis.fetch = fetchSpy;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("includes lineage headers in local dispatch when provided", async () => {
    const client = createCloudTasksClient({
      projectId: "test-project",
      region: "us-central1",
      queueName: "test-queue",
      workerBaseUrl: "http://localhost:3001",
      localDispatch: true,
    });

    await client.enqueueTask({
      path: "/tasks/test",
      payload: { data: 1 },
      parentRunId: "parent-run-123",
      rootRunId: "root-run-456",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers).toMatchObject({
      "X-Workload-Run-Parent-Id": "parent-run-123",
      "X-Workload-Run-Root-Id": "root-run-456",
    });
  });

  it("omits lineage headers when not provided", async () => {
    const client = createCloudTasksClient({
      projectId: "test-project",
      region: "us-central1",
      queueName: "test-queue",
      workerBaseUrl: "http://localhost:3001",
      localDispatch: true,
    });

    await client.enqueueTask({
      path: "/tasks/test",
      payload: { data: 1 },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers).not.toHaveProperty("X-Workload-Run-Parent-Id");
    expect(init.headers).not.toHaveProperty("X-Workload-Run-Root-Id");
  });
});
