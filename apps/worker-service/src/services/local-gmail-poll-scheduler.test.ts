import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GMAIL_POLL_INTERVAL_MS,
  startLocalGmailPollScheduler,
} from "./local-gmail-poll-scheduler.js";

describe("startLocalGmailPollScheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("posts gmail-poll on each interval when mode is poll", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "",
    });
    const log = vi.fn();

    const scheduler = startLocalGmailPollScheduler({
      workerBaseUrl: "http://127.0.0.1:3001",
      getDeliveryMode: async () => "poll",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      log,
    });

    expect(fetchImpl).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(GMAIL_POLL_INTERVAL_MS);

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/tasks/gmail-poll",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Local-Task-Dispatcher": "true",
        }),
      }),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Local Gmail poll tick enqueued" }),
    );

    scheduler.stop();
  });

  it("skips HTTP when delivery mode is push", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn();
    const log = vi.fn();

    const scheduler = startLocalGmailPollScheduler({
      workerBaseUrl: "http://127.0.0.1:3001/",
      getDeliveryMode: async () => "push",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      log,
    });

    await vi.advanceTimersByTimeAsync(GMAIL_POLL_INTERVAL_MS);

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Local Gmail poll tick skipped: delivery mode is not poll",
        deliveryMode: "push",
      }),
    );

    scheduler.stop();
  });
});
