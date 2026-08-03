import type { FastifyInstance } from "fastify";

import type { WorkloadRunRecorder } from "@repo/workload-runs";

import type { AiChatProcessorDeps } from "../services/ai-chat-processor.js";
import type { AiUiBuilderProcessorDeps } from "../services/ai-ui-builder-processor.js";
import type { DataHookProcessorDeps } from "../services/data-hook-processor.js";
import type { ScheduleTickRouteDeps } from "../routes/schedule-tick.route.js";
import type { TenantDeletionTaskRouteDeps } from "../routes/tenant-deletion-task.route.js";
import { oidcAuthHook } from "../middleware/oidc-auth.middleware.js";
import { aiChatTaskRoute } from "./ai-chat-task.route.js";
import { aiUiBuilderTaskRoute } from "./ai-ui-builder-task.route.js";
import { dataHookTaskRoute } from "./data-hook-task.route.js";
import { scheduleTickRoute } from "./schedule-tick.route.js";
import { tenantDeletionTaskRoute } from "./tenant-deletion-task.route.js";
import { gmailIngestTaskRoute } from "./gmail-ingest-task.route.js";
import { recordNarrativeRefreshTaskRoute } from "./record-narrative-refresh-task.route.js";
import { documentExtractionTaskRoute } from "./document-extraction-task.route.js";
import type { GmailIngestProcessorDeps } from "../services/gmail-ingest-processor.js";
import type { RecordNarrativeRefreshProcessor } from "../services/record-narrative-refresh-processor.js";
import type { DocumentExtractionProcessor } from "../services/document-extraction-processor.js";

export type WorkerTaskScopeDeps = AiChatProcessorDeps &
  AiUiBuilderProcessorDeps &
  DataHookProcessorDeps &
  ScheduleTickRouteDeps &
  TenantDeletionTaskRouteDeps & {
    readonly gmailIngest?: GmailIngestProcessorDeps;
    readonly refreshNarrative?: RecordNarrativeRefreshProcessor;
    readonly processDocumentExtraction?: DocumentExtractionProcessor;
    readonly workloadRunRecorder?: WorkloadRunRecorder;
  };

export async function taskScope(
  app: FastifyInstance,
  deps: WorkerTaskScopeDeps,
): Promise<void> {
  app.addHook("preHandler", oidcAuthHook);
  await app.register(aiChatTaskRoute, deps);
  await app.register(aiUiBuilderTaskRoute, deps);
  await app.register(dataHookTaskRoute, deps);
  await app.register(scheduleTickRoute, deps);
  await app.register(tenantDeletionTaskRoute, deps);
  if (deps.refreshNarrative) {
    await app.register(recordNarrativeRefreshTaskRoute, {
      refreshNarrative: deps.refreshNarrative,
      workloadRunRecorder: deps.workloadRunRecorder,
    });
  }
  if (deps.processDocumentExtraction) {
    await app.register(documentExtractionTaskRoute, {
      processDocumentExtraction: deps.processDocumentExtraction,
      workloadRunRecorder: deps.workloadRunRecorder,
    });
  }
  if (deps.gmailIngest) {
    await app.register(gmailIngestTaskRoute, {
      ...deps.gmailIngest,
      workloadRunRecorder: deps.workloadRunRecorder,
    });
  }
}
