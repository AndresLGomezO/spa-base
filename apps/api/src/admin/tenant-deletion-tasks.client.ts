import type { TenantDeletionTaskPayload } from "@repo/gcp-firebase";

import {
  buildDeterministicTaskId,
  createCloudTasksClient,
  type CloudTasksClientConfig,
} from "../ai/cloud-tasks.client.js";
import { HOOK_TASK_ROUTES } from "../hooks/hook-task-routes.js";

export function createTenantDeletionTasksClient(config: CloudTasksClientConfig) {
  const cloudTasks = createCloudTasksClient(config);

  return {
    async enqueueTenantDeletionTask(
      payload: TenantDeletionTaskPayload,
    ): Promise<void> {
      await cloudTasks.enqueueTask({
        path: HOOK_TASK_ROUTES.DELETE_TENANT,
        payload,
        taskId: buildDeterministicTaskId(
          "delete-tenant",
          payload.tenantId,
          `${payload.jobId}:${payload.archiveId}`,
        ),
      });
    },
  };
}
