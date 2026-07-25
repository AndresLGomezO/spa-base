import {
  buildAiRecordSummaryDocId,
  type AiRecordSummaryNarrative,
  type AiRecordSummaryRag,
  type AiRecordSummaryRecord,
  type AiRecordSummaryRepository,
} from "../storage/ai-record-summary.schema.js";
import { hashSourceValue } from "../utils/hash.js";

export {
  readAiRecordSummaryField,
  resolvesFromAiRecordSummary,
} from "../storage/read-ai-record-summary-field.js";

export interface UpsertAiRecordContextInput {
  readonly tenantId: string;
  readonly entityName: string;
  readonly recordId: string;
  readonly context: Readonly<Record<string, unknown>>;
  readonly ownerId?: string;
  readonly accessUserIds?: readonly string[];
  readonly tenantWideRead?: boolean;
  /** When set, updates rag.text/hash/sourceHash (embedding left to caller). */
  readonly ragText?: string;
}

export interface UpsertAiRecordContextResult {
  readonly record: AiRecordSummaryRecord;
  readonly contextChanged: boolean;
  readonly narrativeStale: boolean;
}

export async function upsertAiRecordContext(
  repository: AiRecordSummaryRepository,
  input: UpsertAiRecordContextInput,
): Promise<UpsertAiRecordContextResult> {
  const now = new Date().toISOString();
  const id = buildAiRecordSummaryDocId(input.entityName, input.recordId);
  const existing = await repository.get(
    input.tenantId,
    input.entityName,
    input.recordId,
  );
  const contextHash = hashSourceValue(input.context);
  const contextChanged = existing?.contextHash !== contextHash;

  let rag: AiRecordSummaryRag | undefined = existing?.rag;
  if (input.ragText !== undefined) {
    const ragHash = hashSourceValue({ text: input.ragText, contextHash });
    rag = {
      text: input.ragText,
      hash: ragHash,
      sourceHash: contextHash,
      updatedAt: now,
      ...(existing?.rag?.embedding && existing.rag.hash === ragHash
        ? { embedding: existing.rag.embedding }
        : {}),
    };
  } else if (rag && contextChanged) {
    rag = {
      ...rag,
      sourceHash: contextHash,
      updatedAt: now,
    };
  }

  const narratives = existing?.narratives ?? {};
  const defaultNarrative = narratives.default;
  const narrativeStale =
    !defaultNarrative || defaultNarrative.sourceHash !== contextHash;

  const record = await repository.upsert({
    id,
    tenantId: input.tenantId,
    entityName: input.entityName,
    recordId: input.recordId,
    ...(input.ownerId !== undefined
      ? { ownerId: input.ownerId }
      : existing?.ownerId
        ? { ownerId: existing.ownerId }
        : {}),
    accessUserIds: [...(input.accessUserIds ?? existing?.accessUserIds ?? [])],
    tenantWideRead: input.tenantWideRead ?? existing?.tenantWideRead ?? false,
    context: { ...input.context },
    contextHash,
    ...(rag ? { rag } : {}),
    narratives,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });

  return { record, contextChanged, narrativeStale };
}

export async function upsertAiRecordRag(
  repository: AiRecordSummaryRepository,
  input: {
    readonly tenantId: string;
    readonly entityName: string;
    readonly recordId: string;
    readonly text: string;
    readonly embedding?: readonly number[];
    readonly ownerId?: string;
    readonly accessUserIds?: readonly string[];
    readonly tenantWideRead?: boolean;
  },
): Promise<AiRecordSummaryRecord> {
  const now = new Date().toISOString();
  const existing = await repository.get(
    input.tenantId,
    input.entityName,
    input.recordId,
  );
  const sourceHash = existing?.contextHash ?? hashSourceValue(input.text);
  const hash = hashSourceValue({ text: input.text, sourceHash });
  const rag: AiRecordSummaryRag = {
    text: input.text,
    hash,
    sourceHash,
    updatedAt: now,
    ...(input.embedding ? { embedding: [...input.embedding] } : {}),
  };

  return repository.upsert({
    id: buildAiRecordSummaryDocId(input.entityName, input.recordId),
    tenantId: input.tenantId,
    entityName: input.entityName,
    recordId: input.recordId,
    ...(input.ownerId !== undefined
      ? { ownerId: input.ownerId }
      : existing?.ownerId
        ? { ownerId: existing.ownerId }
        : {}),
    accessUserIds: [...(input.accessUserIds ?? existing?.accessUserIds ?? [])],
    tenantWideRead: input.tenantWideRead ?? existing?.tenantWideRead ?? false,
    ...(existing?.context ? { context: existing.context } : {}),
    ...(existing?.contextHash ? { contextHash: existing.contextHash } : {}),
    rag,
    narratives: existing?.narratives ?? {},
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
}

export async function upsertAiRecordNarrative(
  repository: AiRecordSummaryRepository,
  input: {
    readonly tenantId: string;
    readonly entityName: string;
    readonly recordId: string;
    readonly variant: string;
    readonly text: string;
    readonly sourceHash: string;
    readonly model?: string;
  },
): Promise<AiRecordSummaryRecord> {
  const now = new Date().toISOString();
  const existing = await repository.get(
    input.tenantId,
    input.entityName,
    input.recordId,
  );
  if (!existing) {
    throw new Error(
      `AI record summary not found for ${input.entityName}/${input.recordId}`,
    );
  }

  const narrative: AiRecordSummaryNarrative = {
    text: input.text,
    sourceHash: input.sourceHash,
    updatedAt: now,
    ...(input.model ? { model: input.model } : {}),
  };

  return repository.upsert({
    ...existing,
    narratives: {
      ...existing.narratives,
      [input.variant]: narrative,
    },
    updatedAt: now,
  });
}
