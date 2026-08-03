export const AI_TASK_ROUTES = {
  PROCESS_AI_CHAT: "/tasks/process-ai-chat",
  PROCESS_AI_UI_BUILDER: "/tasks/process-ai-ui-builder",
  REFRESH_RECORD_NARRATIVE: "/tasks/refresh-record-narrative",
  PROCESS_DOCUMENT_EXTRACTION: "/tasks/process-document-extraction",
} as const;

export interface ProcessAiChatTaskPayload {
  readonly jobId: string;
  readonly tenantId: string;
}

export interface ProcessDocumentExtractionTaskPayload {
  readonly tenantId: string;
  readonly attachmentId: string;
  readonly templateId?: string;
  readonly requestedBy?: string;
}
