import { describe, expect, it, vi } from "vitest";

import { buildSeedHookObservabilityServices } from "./seed-hook-runner.js";

vi.mock("@repo/debug-logs", () => ({
  createPersistingHookLogger: vi.fn(({ base }) => ({
    info: base.info,
    error: base.error,
    __persisting: true,
  })),
}));

vi.mock("@repo/gcp-firebase", () => ({
  createFirestoreAdminDataHookExecutionRepository: vi.fn(() => ({})),
  createFirestoreAdminHookLogMessageRepository: vi.fn(() => ({})),
  createFirestoreAdminUserNotificationRepository: vi.fn(() => ({})),
}));

describe("buildSeedHookObservabilityServices", () => {
  const firebaseAdminConfig = { projectId: "demo" };

  it("returns console-only logger when observability is disabled", () => {
    const services = buildSeedHookObservabilityServices({
      observabilityEnabled: false,
      tenantId: "rates",
      firebaseAdminConfig,
    });

    expect(services.recordDataHookExecution).toBeUndefined();
    expect(services.dataHookExecutionRecorder).toBeUndefined();
    expect(services.sendUserNotification).toBeUndefined();
    expect(services.logger).toEqual(
      expect.objectContaining({
        info: expect.any(Function),
        error: expect.any(Function),
      }),
    );
    expect(
      (services.logger as { __persisting?: boolean }).__persisting,
    ).toBeUndefined();
  });

  it("wires execution recorder, persisting logger, and notifications when enabled", async () => {
    const { createPersistingHookLogger } = await import("@repo/debug-logs");

    const services = buildSeedHookObservabilityServices({
      observabilityEnabled: true,
      tenantId: "rates",
      firebaseAdminConfig,
    });

    expect(createPersistingHookLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "rates",
      }),
    );
    expect(services.recordDataHookExecution).toEqual(expect.any(Function));
    expect(services.dataHookExecutionRecorder).toBeDefined();
    expect(services.sendUserNotification).toEqual(expect.any(Function));
    expect(
      (services.logger as { __persisting?: boolean }).__persisting,
    ).toBe(true);
  });
});
