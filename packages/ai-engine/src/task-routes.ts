export const AI_TASK_ROUTES = {
  PROCESS_AI_CHAT: "/tasks/process-ai-chat",
  PROCESS_AI_UI_BUILDER: "/tasks/process-ai-ui-builder",
  REFRESH_USER_AI_MEMORY: "/tasks/refresh-user-ai-memory",
  NIGHTLY_USER_AI_MEMORY: "/tasks/nightly-user-ai-memory",
  REFRESH_RECORD_NARRATIVE: "/tasks/refresh-record-narrative",
} as const;

export interface ProcessAiChatTaskPayload {
  readonly jobId: string;
  readonly tenantId: string;
}
