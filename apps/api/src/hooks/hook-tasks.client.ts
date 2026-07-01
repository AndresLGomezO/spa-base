import type { DataHookJobPayload } from "@repo/hooks";

import {
  buildDeterministicTaskId,
  createCloudTasksClient,
  type CloudTasksClientConfig,
} from "../ai/cloud-tasks.client.js";
import { HOOK_TASK_ROUTES } from "./hook-task-routes.js";

export function createHookTasksClient(config: CloudTasksClientConfig) {
  const cloudTasks = createCloudTasksClient(config);

  return {
    async enqueueDataHookJob(payload: DataHookJobPayload): Promise<void> {
      const recordId =
        typeof payload.current.id === "string" ? payload.current.id : "unknown";

      await cloudTasks.enqueueTask({
        path: HOOK_TASK_ROUTES.PROCESS_DATA_HOOK,
        payload,
        taskId: buildDeterministicTaskId(
          "data-hook",
          payload.hookId,
          `${payload.tenantId}:${payload.entityName}:${recordId}:${payload.hookId}`,
        ),
      });
    },
  };
}
