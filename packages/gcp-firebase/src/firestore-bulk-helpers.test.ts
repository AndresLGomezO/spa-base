import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createThrottledProgressReporter,
  FIRESTORE_BATCH_LIMIT,
} from "./firestore-bulk-helpers.js";

describe("createThrottledProgressReporter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("flushes accumulated deltas in batches instead of per report", async () => {
    const onFlush = vi.fn();
    const reporter = createThrottledProgressReporter(onFlush, {
      flushEveryDocs: 3,
      flushEveryMs: 60_000,
    });

    reporter.report({ docsCopied: 1 });
    reporter.report({ docsCopied: 1 });
    expect(onFlush).not.toHaveBeenCalled();

    reporter.report({ docsCopied: 1 });
    await reporter.flush();

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith({ docsCopied: 3 });
  });

  it("flushes on elapsed time threshold", async () => {
    const onFlush = vi.fn();
    const reporter = createThrottledProgressReporter(onFlush, {
      flushEveryDocs: 10_000,
      flushEveryMs: 1000,
    });

    reporter.report({ docsDeleted: 1 });
    expect(onFlush).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    reporter.report({});
    await reporter.flush();

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith({ docsDeleted: 1 });
  });

  it("flushes remaining progress on close", async () => {
    const onFlush = vi.fn();
    const reporter = createThrottledProgressReporter(onFlush, {
      flushEveryDocs: 10_000,
      flushEveryMs: 60_000,
    });

    reporter.report({ collectionsCopied: 2, docsCopied: 1 });
    await reporter.close();

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith({
      collectionsCopied: 2,
      docsCopied: 1,
    });
  });
});

describe("FIRESTORE_BATCH_LIMIT", () => {
  it("uses Firestore maximum batch size", () => {
    expect(FIRESTORE_BATCH_LIMIT).toBe(500);
  });
});
