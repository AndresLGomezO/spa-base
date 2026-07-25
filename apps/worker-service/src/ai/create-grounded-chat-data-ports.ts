import type {
  AiRecordSummaryRepository,
  EntityDefinitionRepository,
  EntityQueryDefinitionRepository,
  MetricDefinitionRepository,
  MetricValueRepository,
  TenantScopedEntityRepository,
  UserAiMemoryRepository,
} from "@repo/firestore-converters";
import { readAiRecordSummaryField } from "@repo/ai-context";
import type { AiController } from "@repo/ai-engine/controller";
import {
  redactForPrompt,
  type GroundedChatDataPorts,
  type GroundedChatRecordHit,
} from "@repo/ai-engine/grounded-chat";
import type { VectorIndexService } from "@repo/ai-retrieval";
import { evaluateEntityQueryFilterTree } from "@repo/entity-queries";
import type { FilterNode } from "@repo/entity-queries";

type GenericRecord = {
  readonly id: string;
  readonly tenantId: string;
  readonly [key: string]: unknown;
};

export interface CreateGroundedChatDataPortsDeps {
  readonly getRepository: (
    tenantId: string,
    entityName: string,
  ) => TenantScopedEntityRepository<GenericRecord, unknown> | undefined;
  readonly listEntityNames: (tenantId: string) => Promise<readonly string[]>;
  readonly isTenantWideRead: (tenantId: string, entityName: string) => boolean;
  readonly metricDefinitionRepository?: MetricDefinitionRepository;
  readonly metricValueRepository?: MetricValueRepository;
  readonly entityQueryDefinitionRepository?: EntityQueryDefinitionRepository;
  readonly userAiMemoryRepository: UserAiMemoryRepository;
  readonly entityDefinitionRepository?: EntityDefinitionRepository;
  readonly aiRecordSummaryRepository?: AiRecordSummaryRepository;
  readonly vectorIndexService?: VectorIndexService;
  readonly aiController?: AiController;
  /** Optional field access maps keyed by entity name. */
  readonly resolveFieldAccessMap?: (
    tenantId: string,
    userId: string,
    entityName: string,
  ) => Promise<Readonly<Record<string, "read" | "write" | "none">> | undefined>;
  /** Optional PII level maps keyed by entity name. */
  readonly resolvePiiLevel?: (
    tenantId: string,
    entityName: string,
  ) => Promise<
    Readonly<Record<string, "public" | "masked" | "excluded">> | undefined
  >;
}

function recordLabel(record: GenericRecord): string {
  for (const key of ["name", "title", "label", "description"] as const) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim().slice(0, 200);
    }
  }
  return record.id;
}

function userCanSee(
  record: GenericRecord,
  userId: string,
  tenantWideRead: boolean,
): boolean {
  if (tenantWideRead) {
    return true;
  }
  const access = record.accessUserIds;
  if (Array.isArray(access) && access.includes(userId)) {
    return true;
  }
  return record.ownerId === userId;
}

async function toHit(
  deps: CreateGroundedChatDataPortsDeps,
  tenantId: string,
  userId: string,
  entityName: string,
  record: GenericRecord,
  score?: number,
): Promise<GroundedChatRecordHit> {
  const fieldAccessMap = deps.resolveFieldAccessMap
    ? await deps.resolveFieldAccessMap(tenantId, userId, entityName)
    : undefined;
  const piiLevel = deps.resolvePiiLevel
    ? await deps.resolvePiiLevel(tenantId, entityName)
    : undefined;
  const aiDoc = deps.aiRecordSummaryRepository
    ? await deps.aiRecordSummaryRepository.get(tenantId, entityName, record.id)
    : null;
  const enriched: Record<string, unknown> = { ...record };
  const ragText = readAiRecordSummaryField(aiDoc, "rag.text");
  const narrative = readAiRecordSummaryField(aiDoc, "narratives.default.text");
  if (ragText) enriched.ragText = ragText;
  if (narrative) enriched.aiSummaryText = narrative;
  const fields = redactForPrompt({
    record: enriched,
    ...(fieldAccessMap ? { fieldAccessMap } : {}),
    ...(piiLevel ? { piiLevel } : {}),
  });
  return {
    entityName,
    recordId: record.id,
    label: recordLabel(record),
    fields,
    ...(score != null ? { score } : {}),
  };
}

export function createGroundedChatDataPorts(
  deps: CreateGroundedChatDataPortsDeps,
): GroundedChatDataPorts {
  const keywordSearch: GroundedChatDataPorts["searchRecords"] = async (
    tenantId,
    userId,
    args,
  ) => {
    const repository = deps.getRepository(tenantId, args.entityName);
    if (!repository) {
      return [];
    }
    const tenantWide = deps.isTenantWideRead(tenantId, args.entityName);
    const page = await repository.findAll({
      tenantId,
      limit: Math.min((args.limit ?? 10) * 5, 100),
    });
    const q = args.q?.trim().toLowerCase();
    const hits: GroundedChatRecordHit[] = [];
    for (const record of page.items) {
      if (!userCanSee(record, userId, tenantWide)) {
        continue;
      }
      if (q) {
        const hay = JSON.stringify(redactForPrompt({ record })).toLowerCase();
        if (!hay.includes(q)) {
          continue;
        }
      }
      hits.push(await toHit(deps, tenantId, userId, args.entityName, record));
      if (hits.length >= (args.limit ?? 10)) {
        break;
      }
    }
    return hits;
  };

  return {
    async listEntities(tenantId) {
      const names = await deps.listEntityNames(tenantId);
      return names.map((name) => ({ name, label: name }));
    },

    async listMetrics(tenantId) {
      if (!deps.metricDefinitionRepository) {
        return [];
      }
      const metrics =
        await deps.metricDefinitionRepository.listActive(tenantId);
      return metrics.map((m) => ({
        id: m.id,
        name: m.name,
      }));
    },

    async listQueries(tenantId) {
      if (!deps.entityQueryDefinitionRepository) {
        return [];
      }
      const queries =
        await deps.entityQueryDefinitionRepository.listActive(tenantId);
      return queries.map((q) => ({
        id: q.id,
        name: q.name,
        ...(q.sourceEntity ? { entityName: q.sourceEntity } : {}),
      }));
    },

    searchRecords: keywordSearch,
    keywordSearchRecords: keywordSearch,

    async semanticSearchRecords(tenantId, userId, args) {
      if (!deps.vectorIndexService || !deps.aiController) {
        return keywordSearch(tenantId, userId, {
          entityName: args.entityName,
          q: args.queryText,
          limit: args.topK ?? 10,
        });
      }

      const embedResult = await deps.aiController.runAiRequest({
        tenantId,
        feature: "dataHookEmbedding",
        operation: "generateEmbedding",
        requestedBy: userId,
        permission: "ai.dataHook.run",
        input: {
          kind: "dataHookEmbedding",
          hookId: "grounded-chat-semantic-search",
          text: args.queryText,
          entityName: args.entityName,
        },
        params: {
          operation: "generateEmbedding",
          text: args.queryText,
        },
      });

      const embedding = embedResult.embeddingVector;
      if (!embedding?.length) {
        return keywordSearch(tenantId, userId, {
          entityName: args.entityName,
          q: args.queryText,
          limit: args.topK ?? 10,
        });
      }

      const neighbors = await deps.vectorIndexService.queryTopK({
        tenantId,
        userId,
        entityName: args.entityName,
        embedding,
        topK: args.topK ?? 10,
        minScore: 0.2,
      });

      const repository = deps.getRepository(tenantId, args.entityName);
      if (!repository) {
        return [];
      }
      const tenantWide = deps.isTenantWideRead(tenantId, args.entityName);
      const hits: GroundedChatRecordHit[] = [];
      for (const neighbor of neighbors) {
        const record = await repository.findById(neighbor.recordId, tenantId);
        if (!record || !userCanSee(record, userId, tenantWide)) {
          continue;
        }
        hits.push(
          await toHit(
            deps,
            tenantId,
            userId,
            args.entityName,
            record,
            neighbor.score,
          ),
        );
      }
      return hits;
    },

    async getRecord(tenantId, userId, args) {
      const repository = deps.getRepository(tenantId, args.entityName);
      if (!repository) {
        return null;
      }
      const record = await repository.findById(args.recordId, tenantId);
      if (!record) {
        return null;
      }
      const tenantWide = deps.isTenantWideRead(tenantId, args.entityName);
      if (!userCanSee(record, userId, tenantWide)) {
        return null;
      }
      return toHit(deps, tenantId, userId, args.entityName, record);
    },

    async getUserMemoryFacts(tenantId, userId, args) {
      const memory = await deps.userAiMemoryRepository.get(tenantId, userId);
      if (!memory) {
        return [];
      }
      const keys = args?.keys;
      return memory.factIndex
        .filter((f) => !keys || keys.includes(f.key))
        .map((f) => ({
          key: f.key,
          value: f.value,
          entityRefs: f.entityRefs,
        }));
    },

    async runSavedQuery(tenantId, userId, args) {
      if (!deps.entityQueryDefinitionRepository) {
        return [];
      }
      const definition = await deps.entityQueryDefinitionRepository.getById(
        tenantId,
        args.queryId,
      );
      if (!definition?.sourceEntity) {
        return [];
      }
      const repository = deps.getRepository(tenantId, definition.sourceEntity);
      if (!repository) {
        return [];
      }
      const tenantWide = deps.isTenantWideRead(
        tenantId,
        definition.sourceEntity,
      );
      const page = await repository.findAll({
        tenantId,
        limit: Math.min((args.limit ?? 10) * 10, 200),
      });
      const filter = definition.filter as FilterNode | undefined;
      const hits: GroundedChatRecordHit[] = [];
      for (const record of page.items) {
        if (!userCanSee(record, userId, tenantWide)) {
          continue;
        }
        if (filter && !evaluateEntityQueryFilterTree(record, filter)) {
          continue;
        }
        hits.push(
          await toHit(deps, tenantId, userId, definition.sourceEntity, record),
        );
        if (hits.length >= (args.limit ?? 10)) {
          break;
        }
      }
      return hits;
    },

    async runMetric(tenantId, userId, args) {
      if (!deps.metricDefinitionRepository) {
        return null;
      }
      const definition = await deps.metricDefinitionRepository.getById(
        tenantId,
        args.metricId,
      );
      if (!definition) {
        return null;
      }

      if (deps.metricValueRepository) {
        try {
          const value = await deps.metricValueRepository.getById(
            tenantId,
            definition.name,
            `${userId}:default`,
          );
          if (value) {
            return {
              metricId: definition.id,
              name: definition.name,
              values: value.values,
              dimensions: value.dimensions,
            };
          }
        } catch {
          // Fall through to metadata-only response.
        }
      }

      return {
        metricId: definition.id,
        name: definition.name,
        note: "Metric definition found; no stored value row for this user/default key.",
      };
    },
  };
}
