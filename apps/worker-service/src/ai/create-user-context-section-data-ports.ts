import {
  readAiRecordSummaryField,
  resolvesFromAiRecordSummary,
} from "@repo/ai-context";
import type { UserContextSectionDataPorts } from "@repo/ai-engine/grounded-chat";
import { redactForPrompt } from "@repo/ai-engine/grounded-chat";
import type {
  AiRecordSummaryRepository,
  TenantScopedEntityRepository,
} from "@repo/firestore-converters";

type GenericRecord = {
  readonly id: string;
  readonly tenantId: string;
  readonly [key: string]: unknown;
};

function userCanSee(
  record: GenericRecord,
  userId: string,
  tenantWideRead: boolean,
): boolean {
  if (tenantWideRead) return true;
  const access = record.accessUserIds;
  if (Array.isArray(access) && access.includes(userId)) return true;
  return record.ownerId === userId;
}

function matchesWhere(
  record: GenericRecord,
  where:
    | readonly {
        readonly field: string;
        readonly operator: string;
        readonly value: unknown;
      }[]
    | undefined,
): boolean {
  if (!where || where.length === 0) return true;
  return where.every((condition) => {
    const actual = record[condition.field];
    switch (condition.operator) {
      case "eq":
        return actual === condition.value;
      case "neq":
        return actual !== condition.value;
      case "gt":
        return (
          typeof actual === "number" &&
          typeof condition.value === "number" &&
          actual > condition.value
        );
      case "gte":
        return (
          typeof actual === "number" &&
          typeof condition.value === "number" &&
          actual >= condition.value
        );
      case "lt":
        return (
          typeof actual === "number" &&
          typeof condition.value === "number" &&
          actual < condition.value
        );
      case "lte":
        return (
          typeof actual === "number" &&
          typeof condition.value === "number" &&
          actual <= condition.value
        );
      case "contains":
        return (
          typeof actual === "string" &&
          typeof condition.value === "string" &&
          actual.toLowerCase().includes(condition.value.toLowerCase())
        );
      case "in":
        return (
          Array.isArray(condition.value) && condition.value.includes(actual)
        );
      default:
        return false;
    }
  });
}

function pickFields(
  record: GenericRecord,
  fields: readonly string[],
  aiDoc: Parameters<typeof readAiRecordSummaryField>[0],
): Record<string, unknown> {
  const subset: Record<string, unknown> = { id: record.id };
  for (const field of fields) {
    if (resolvesFromAiRecordSummary(field)) {
      const fromAi = readAiRecordSummaryField(aiDoc, field);
      if (fromAi !== undefined) {
        subset[field] = fromAi;
        continue;
      }
    }
    subset[field] = record[field];
  }
  return redactForPrompt({ record: subset });
}

export function createUserContextSectionDataPorts(deps: {
  readonly tenantId: string;
  readonly userId: string;
  readonly getRepository: (
    tenantId: string,
    entityName: string,
  ) => TenantScopedEntityRepository<GenericRecord, unknown> | undefined;
  readonly isTenantWideRead: (tenantId: string, entityName: string) => boolean;
  readonly aiRecordSummaryRepository?: AiRecordSummaryRepository;
}): UserContextSectionDataPorts {
  async function loadAiDoc(entityName: string, recordId: string) {
    if (!deps.aiRecordSummaryRepository) return null;
    return deps.aiRecordSummaryRepository.get(
      deps.tenantId,
      entityName,
      recordId,
    );
  }

  return {
    async getEntityField(args) {
      const repository = deps.getRepository(deps.tenantId, args.entityName);
      if (!repository) return null;
      const tenantWide = deps.isTenantWideRead(deps.tenantId, args.entityName);

      if (args.source === "recordId" && args.recordId) {
        const record = await repository.findById(args.recordId, deps.tenantId);
        if (!record || !userCanSee(record, deps.userId, tenantWide)) {
          return null;
        }
        if (resolvesFromAiRecordSummary(args.field)) {
          const aiDoc = await loadAiDoc(args.entityName, args.recordId);
          const fromAi = readAiRecordSummaryField(aiDoc, args.field);
          if (fromAi !== undefined) return fromAi;
        }
        return record[args.field] ?? null;
      }

      const page = await repository.findAll({
        tenantId: deps.tenantId,
        limit: 50,
      });
      for (const record of page.items) {
        if (!userCanSee(record, deps.userId, tenantWide)) continue;
        if (!matchesWhere(record, args.where)) continue;
        if (resolvesFromAiRecordSummary(args.field)) {
          const aiDoc = await loadAiDoc(args.entityName, record.id);
          const fromAi = readAiRecordSummaryField(aiDoc, args.field);
          if (fromAi !== undefined) return fromAi;
        }
        return record[args.field] ?? null;
      }
      return null;
    },

    async listEntityRecords(args) {
      const repository = deps.getRepository(deps.tenantId, args.entityName);
      if (!repository) return [];
      const tenantWide = deps.isTenantWideRead(deps.tenantId, args.entityName);
      const page = await repository.findAll({
        tenantId: deps.tenantId,
        limit: Math.min(args.limit * 3, 100),
      });
      const visible: GenericRecord[] = [];
      for (const record of page.items) {
        if (!userCanSee(record, deps.userId, tenantWide)) continue;
        if (!matchesWhere(record, args.where)) continue;
        visible.push(record);
        if (visible.length >= args.limit) break;
      }

      const needsAi = args.fields.some((field) =>
        resolvesFromAiRecordSummary(field),
      );
      const aiDocs =
        needsAi && deps.aiRecordSummaryRepository
          ? await deps.aiRecordSummaryRepository.getMany(
              deps.tenantId,
              visible.map((record) => ({
                entityName: args.entityName,
                recordId: record.id,
              })),
            )
          : [];
      const aiById = new Map(
        aiDocs.map((doc) => [`${doc.entityName}__${doc.recordId}`, doc]),
      );

      return visible.map((record) =>
        pickFields(
          record,
          args.fields,
          aiById.get(`${args.entityName}__${record.id}`) ?? null,
        ),
      );
    },
  };
}
