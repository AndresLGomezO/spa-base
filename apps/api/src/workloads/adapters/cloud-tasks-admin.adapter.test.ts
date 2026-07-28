import { describe, it, expect, vi } from "vitest";

import {
  createCloudTasksAdminAdapter,
  type CloudTasksAdminConfig,
} from "./cloud-tasks-admin.adapter.js";

describe("createCloudTasksAdminAdapter", () => {
  const localConfig: CloudTasksAdminConfig = {
    projectId: "test-project",
    region: "us-central1",
    localMode: true,
  };

  describe("localMode", () => {
    it("getState returns running", async () => {
      const adapter = createCloudTasksAdminAdapter(localConfig);
      const state = await adapter.getState("my-queue");
      expect(state.status).toBe("running");
      expect(state.live.state).toBe("RUNNING");
    });

    it("pause logs instead of calling GCP", async () => {
      const adapter = createCloudTasksAdminAdapter(localConfig);
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      await adapter.pause("my-queue");
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("resume logs instead of calling GCP", async () => {
      const adapter = createCloudTasksAdminAdapter(localConfig);
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      await adapter.resume("my-queue");
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("listPendingTasks returns empty array", async () => {
      const adapter = createCloudTasksAdminAdapter(localConfig);
      const tasks = await adapter.listPendingTasks("my-queue");
      expect(tasks).toEqual([]);
    });
  });
});
