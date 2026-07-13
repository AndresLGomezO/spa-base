import { describe, expect, it } from "vitest";

import { createAsyncSemaphore } from "./async-semaphore.js";

describe("createAsyncSemaphore", () => {
  it("runs tasks within the concurrency limit", async () => {
    const gate = createAsyncSemaphore(1);
    let running = 0;
    let maxRunning = 0;

    const task = async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 20));
      running -= 1;
    };

    await Promise.all([gate.run(task), gate.run(task), gate.run(task)]);

    expect(maxRunning).toBe(1);
  });

  it("allows up to the configured concurrency", async () => {
    const gate = createAsyncSemaphore(2);
    let running = 0;
    let maxRunning = 0;

    const task = async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 20));
      running -= 1;
    };

    await Promise.all([
      gate.run(task),
      gate.run(task),
      gate.run(task),
      gate.run(task),
    ]);

    expect(maxRunning).toBe(2);
  });
});
