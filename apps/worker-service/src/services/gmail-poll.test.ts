import { describe, expect, it, vi } from "vitest";

import type { HookLogger } from "@repo/hooks";

import { processGmailPoll } from "./gmail-ingest-processor.js";
import type { GmailIngestProcessorDeps } from "./gmail-ingest-processor.js";

function createLogger(): HookLogger {
  return {
    info: vi.fn(),
    error: vi.fn(),
  };
}

function baseDeps(
  overrides: Partial<GmailIngestProcessorDeps>,
): GmailIngestProcessorDeps {
  return {
    getDeliveryMode: async () => "poll",
    gmailConnectionRepository: {
      get: vi.fn(),
      findByEmail: vi.fn(),
      listConnected: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    emailIngestJobRepository: {
      create: vi.fn(),
      appendStep: vi.fn(),
      applyRunProgress: vi.fn(),
      complete: vi.fn(),
      listRecent: vi.fn(),
      get: vi.fn(),
    },
    enqueueWindowSync: vi.fn().mockResolvedValue(undefined),
    enqueueProcessMessage: vi.fn(),
    ...overrides,
  } as unknown as GmailIngestProcessorDeps;
}

describe("processGmailPoll", () => {
  it("no-ops when delivery mode is push", async () => {
    const enqueueWindowSync = vi.fn();
    const listConnected = vi.fn();
    const logger = createLogger();

    const result = await processGmailPoll(
      baseDeps({
        getDeliveryMode: async () => "push",
        enqueueWindowSync,
        gmailConnectionRepository: {
          get: vi.fn(),
          findByEmail: vi.fn(),
          listConnected,
          upsert: vi.fn(),
          delete: vi.fn(),
        },
      }),
      logger,
    );

    expect(result).toEqual({ enqueued: 0, skipped: 0 });
    expect(listConnected).not.toHaveBeenCalled();
    expect(enqueueWindowSync).not.toHaveBeenCalled();
  });

  it("enqueues window sync for each connected mailbox in poll mode", async () => {
    const enqueueWindowSync = vi.fn().mockResolvedValue(undefined);
    const create = vi
      .fn()
      .mockResolvedValueOnce({ id: "job-1" })
      .mockResolvedValueOnce({ id: "job-2" });
    const logger = createLogger();

    const result = await processGmailPoll(
      baseDeps({
        getDeliveryMode: async () => "poll",
        enqueueWindowSync,
        emailIngestJobRepository: {
          create,
          appendStep: vi.fn(),
          applyRunProgress: vi.fn(),
          complete: vi.fn(),
          listRecent: vi.fn(),
          get: vi.fn(),
        },
        gmailConnectionRepository: {
          get: vi.fn(),
          findByEmail: vi.fn(),
          listConnected: vi.fn().mockResolvedValue([
            {
              userId: "u1",
              tenantId: "rates",
              status: "connected",
            },
            {
              userId: "u2",
              tenantId: "rates",
              status: "connected",
            },
          ]),
          upsert: vi.fn(),
          delete: vi.fn(),
        },
      }),
      logger,
    );

    expect(result).toEqual({ enqueued: 2, skipped: 0 });
    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "windowSync" }),
    );
    expect(enqueueWindowSync).toHaveBeenCalledWith({
      tenantId: "rates",
      userId: "u1",
      jobId: "job-1",
    });
    expect(enqueueWindowSync).toHaveBeenCalledWith({
      tenantId: "rates",
      userId: "u2",
      jobId: "job-2",
    });
  });
});
