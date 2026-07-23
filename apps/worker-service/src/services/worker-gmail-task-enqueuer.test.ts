import { describe, expect, it, vi, beforeEach } from "vitest";

const createTask = vi.fn();
const queuePath = vi.fn(
  (project: string, region: string, queue: string) =>
    `projects/${project}/locations/${region}/queues/${queue}`,
);

vi.mock("@google-cloud/tasks", () => ({
  CloudTasksClient: vi.fn(function CloudTasksClient() {
    return { createTask, queuePath };
  }),
}));

describe("createWorkerGmailTaskEnqueuer", () => {
  beforeEach(() => {
    createTask.mockReset();
    queuePath.mockClear();
    vi.unstubAllGlobals();
  });

  it("uses Cloud Tasks with OIDC when localDispatch is false", async () => {
    createTask.mockResolvedValue([{}]);
    const { createWorkerGmailTaskEnqueuer } =
      await import("./worker-gmail-task-enqueuer.js");
    const enqueuer = createWorkerGmailTaskEnqueuer({
      projectId: "demo",
      region: "us-central1",
      queueName: "gmail-jobs",
      workerBaseUrl: "https://worker.example",
      serviceAccountEmail: "tasks@example.com",
      localDispatch: false,
    });

    await enqueuer.enqueueProcessMessage({
      tenantId: "tenant_test",
      userId: "u1",
      jobId: "j1",
      gmailMessageId: "m1",
    });

    expect(createTask).toHaveBeenCalledTimes(1);
    const arg = createTask.mock.calls[0][0];
    expect(arg.task.httpRequest.url).toBe(
      "https://worker.example/tasks/gmail-process-message",
    );
    expect(arg.task.httpRequest.oidcToken).toEqual({
      serviceAccountEmail: "tasks@example.com",
    });
    expect(arg.task.httpRequest.body).toBe(
      Buffer.from(
        JSON.stringify({
          tenantId: "tenant_test",
          userId: "u1",
          jobId: "j1",
          gmailMessageId: "m1",
        }),
      ).toString("base64"),
    );
  });

  it("posts locally when localDispatch is true", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createWorkerGmailTaskEnqueuer } =
      await import("./worker-gmail-task-enqueuer.js");
    const enqueuer = createWorkerGmailTaskEnqueuer({
      projectId: "demo",
      region: "us-central1",
      queueName: "gmail-jobs",
      workerBaseUrl: "http://worker-service:3001",
      localDispatch: true,
    });

    await enqueuer.enqueueProcessMessage({
      tenantId: "tenant_test",
      userId: "u1",
      jobId: "j1",
      gmailMessageId: "m1",
    });

    expect(createTask).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://worker-service:3001/tasks/gmail-process-message",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Local-Task-Dispatcher": "true",
        }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("schedules local process-message work on a serial queue", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 20));
      inFlight -= 1;
      return { ok: true, text: async () => "" };
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createWorkerGmailTaskEnqueuer } =
      await import("./worker-gmail-task-enqueuer.js");
    const enqueuer = createWorkerGmailTaskEnqueuer({
      projectId: "demo",
      region: "us-central1",
      queueName: "gmail-jobs",
      workerBaseUrl: "http://worker-service:3001",
      localDispatch: true,
    });

    await Promise.all([
      enqueuer.enqueueProcessMessage({
        tenantId: "tenant_test",
        userId: "u1",
        jobId: "j1",
        gmailMessageId: "m1",
      }),
      enqueuer.enqueueProcessMessage({
        tenantId: "tenant_test",
        userId: "u1",
        jobId: "j1",
        gmailMessageId: "m2",
      }),
      enqueuer.enqueueProcessMessage({
        tenantId: "tenant_test",
        userId: "u1",
        jobId: "j1",
        gmailMessageId: "m3",
      }),
    ]);

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
    expect(maxInFlight).toBe(1);
  });

  it("uses Cloud Tasks for window sync when localDispatch is false", async () => {
    createTask.mockResolvedValue([{}]);
    const { createWorkerGmailTaskEnqueuer } =
      await import("./worker-gmail-task-enqueuer.js");
    const enqueuer = createWorkerGmailTaskEnqueuer({
      projectId: "demo",
      region: "us-central1",
      queueName: "gmail-jobs",
      workerBaseUrl: "https://worker.example",
      serviceAccountEmail: "tasks@example.com",
      localDispatch: false,
    });

    await enqueuer.enqueueWindowSync({
      tenantId: "tenant_test",
      userId: "u1",
      jobId: "j1",
    });

    expect(createTask).toHaveBeenCalledTimes(1);
    const arg = createTask.mock.calls[0][0];
    expect(arg.task.httpRequest.url).toBe(
      "https://worker.example/tasks/gmail-window-sync",
    );
  });
});
