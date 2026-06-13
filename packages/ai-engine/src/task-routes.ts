export const AI_TASK_ROUTES = {
  PROCESS_AI_CHAT: "/tasks/process-ai-chat",
  PROCESS_AI_UI_BUILDER: "/tasks/process-ai-ui-builder",
} as const;

export interface ProcessAiChatTaskPayload {
  readonly jobId: string;
  readonly tenantId: string;
}
