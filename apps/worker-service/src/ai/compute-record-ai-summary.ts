import {
  aiRecordSummaryTemplateSchema,
  getAiRecordSummaryTemplate,
  upsertAiRecordContext,
  upsertAiRecordRag,
  type TenantAiContextRepository,
} from "@repo/ai-context";
import type { AiRecordSummaryRepository } from "@repo/firestore-converters";
import { computeRecordAiSummary } from "@repo/ai-engine/record-ai-summary";
import type { AiController } from "@repo/ai-engine/controller";
import type {
  DataHookRecordAiSummaryRequest,
  DataHookRecordAiSummaryResult,
  DataHookUpsertAiRecordContextRequest,
  DataHookUpsertAiRecordContextResult,
  DataHookEnqueueAiRecordNarrativeRequest,
} from "@repo/hooks";
import type { VectorIndexService } from "@repo/ai-retrieval";

import type { RecordNarrativeRefreshProcessor } from "../services/record-narrative-refresh-processor.js";

export interface ComputeRecordAiSummaryDeps {
  readonly tenantAiContextRepository: TenantAiContextRepository;
  readonly aiRecordSummaryRepository: AiRecordSummaryRepository;
  readonly aiController: AiController;
  readonly vectorIndexService: VectorIndexService;
  readonly refreshNarrative?: RecordNarrativeRefreshProcessor;
  readonly onRecordSummaryUpdated?: (input: {
    readonly tenantId: string;
    readonly entityName: string;
    readonly recordId: string;
    readonly ownerId?: string;
    readonly accessUserIds: readonly string[];
  }) => void;
}

function authFromRecord(record: Readonly<Record<string, unknown>>): {
  readonly ownerId?: string;
  readonly accessUserIds: readonly string[];
  readonly tenantWideRead: boolean;
} {
  const accessUserIds = Array.isArray(record.accessUserIds)
    ? record.accessUserIds.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  return {
    ...(typeof record.ownerId === "string" ? { ownerId: record.ownerId } : {}),
    accessUserIds,
    tenantWideRead: record.tenantWideRead === true,
  };
}

export function createComputeRecordAiSummary(
  deps: ComputeRecordAiSummaryDeps,
): (
  request: DataHookRecordAiSummaryRequest,
) => Promise<DataHookRecordAiSummaryResult | null> {
  return async (request) => {
    const template = request.template
      ? aiRecordSummaryTemplateSchema.parse(request.template)
      : await getAiRecordSummaryTemplate(
          deps.tenantAiContextRepository,
          request.tenantId,
          request.entityName,
        );
    if (!template) {
      return null;
    }

    const existing = await deps.aiRecordSummaryRepository.get(
      request.tenantId,
      request.entityName,
      request.recordId,
    );
    const computed = computeRecordAiSummary({
      record: {
        ...request.record,
        ...(existing?.rag?.hash ? { aiSummaryHash: existing.rag.hash } : {}),
      },
      template,
    });

    const auth = authFromRecord(request.record);
    const saved = await upsertAiRecordRag(deps.aiRecordSummaryRepository, {
      tenantId: request.tenantId,
      entityName: request.entityName,
      recordId: request.recordId,
      text: computed.aiSummaryText,
      ...auth,
    });

    if (computed.needsReembed || !saved.rag?.embedding) {
      const result = await deps.aiController.runAiRequest({
        tenantId: request.tenantId,
        feature: "dataHookEmbedding",
        operation: "generateEmbedding",
        requestedBy: "system",
        permission: "ai.dataHook.run",
        input: {
          kind: "dataHookEmbedding",
          entityName: request.entityName,
          recordId: request.recordId,
          text: computed.aiSummaryText,
        },
        params: {
          operation: "generateEmbedding",
          text: computed.aiSummaryText,
        },
      });
      if (!result.embeddingVector) {
        throw new Error("Record summary embedding response missing vector.");
      }
      await upsertAiRecordRag(deps.aiRecordSummaryRepository, {
        tenantId: request.tenantId,
        entityName: request.entityName,
        recordId: request.recordId,
        text: computed.aiSummaryText,
        embedding: result.embeddingVector,
        ...auth,
      });
      await deps.vectorIndexService.upsertRecord({
        tenantId: request.tenantId,
        entityName: request.entityName,
        recordId: request.recordId,
        embedding: result.embeddingVector,
        accessUserIds: auth.accessUserIds,
        tenantWideRead: auth.tenantWideRead,
      });
    }

    deps.onRecordSummaryUpdated?.({
      tenantId: request.tenantId,
      entityName: request.entityName,
      recordId: request.recordId,
      ...auth,
    });

    return { ok: true, contextChanged: computed.needsReembed };
  };
}

export function createUpsertAiRecordContext(
  deps: ComputeRecordAiSummaryDeps,
): (
  request: DataHookUpsertAiRecordContextRequest,
) => Promise<DataHookUpsertAiRecordContextResult | null> {
  return async (request) => {
    const auth = authFromRecord(request.record);
    const ragText =
      request.ragText ?? JSON.stringify(request.context).slice(0, 8_000);
    const result = await upsertAiRecordContext(deps.aiRecordSummaryRepository, {
      tenantId: request.tenantId,
      entityName: request.entityName,
      recordId: request.recordId,
      context: request.context,
      ragText,
      ...auth,
    });

    let narrativeEnqueued = false;
    if (
      request.enqueueNarrative !== false &&
      result.narrativeStale &&
      deps.refreshNarrative
    ) {
      await deps.refreshNarrative({
        tenantId: request.tenantId,
        entityName: request.entityName,
        recordId: request.recordId,
        variant: request.narrativeVariant ?? "default",
        ...(request.narrativePrompt ? { prompt: request.narrativePrompt } : {}),
        ...(request.narrativeSystemInstruction
          ? { systemInstruction: request.narrativeSystemInstruction }
          : {}),
      });
      narrativeEnqueued = true;
    }

    if (result.contextChanged && result.record.rag) {
      const text = result.record.rag.text;
      const embedResult = await deps.aiController.runAiRequest({
        tenantId: request.tenantId,
        feature: "dataHookEmbedding",
        operation: "generateEmbedding",
        requestedBy: "system",
        permission: "ai.dataHook.run",
        input: {
          kind: "dataHookEmbedding",
          entityName: request.entityName,
          recordId: request.recordId,
          text,
        },
        params: {
          operation: "generateEmbedding",
          text,
        },
      });
      if (embedResult.embeddingVector) {
        await upsertAiRecordRag(deps.aiRecordSummaryRepository, {
          tenantId: request.tenantId,
          entityName: request.entityName,
          recordId: request.recordId,
          text,
          embedding: embedResult.embeddingVector,
          ...auth,
        });
        await deps.vectorIndexService.upsertRecord({
          tenantId: request.tenantId,
          entityName: request.entityName,
          recordId: request.recordId,
          embedding: embedResult.embeddingVector,
          accessUserIds: auth.accessUserIds,
          tenantWideRead: auth.tenantWideRead,
        });
      }
    }

    deps.onRecordSummaryUpdated?.({
      tenantId: request.tenantId,
      entityName: request.entityName,
      recordId: request.recordId,
      ...auth,
    });

    return {
      ok: true,
      contextChanged: result.contextChanged,
      narrativeEnqueued,
    };
  };
}

export function createEnqueueAiRecordNarrative(
  deps: ComputeRecordAiSummaryDeps,
): (
  request: DataHookEnqueueAiRecordNarrativeRequest,
) => Promise<{ readonly ok: true } | null> {
  return async (request) => {
    if (!deps.refreshNarrative) {
      return null;
    }
    await deps.refreshNarrative({
      tenantId: request.tenantId,
      entityName: request.entityName,
      recordId: request.recordId,
      variant: request.variant ?? "default",
      ...(request.prompt ? { prompt: request.prompt } : {}),
      ...(request.systemInstruction
        ? { systemInstruction: request.systemInstruction }
        : {}),
    });
    return { ok: true };
  };
}
