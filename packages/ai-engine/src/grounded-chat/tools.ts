import type { AiChatCitation } from "@repo/ai-context";

import type {
  GroundedChatCitation,
  GroundedChatToolCall,
  GroundedChatToolName,
} from "./constants.js";

export interface GroundedChatEntitySummary {
  readonly name: string;
  readonly label?: string;
}

export interface GroundedChatMetricSummary {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
}

export interface GroundedChatQuerySummary {
  readonly id: string;
  readonly name: string;
  readonly entityName?: string;
}

export interface GroundedChatRecordHit {
  readonly entityName: string;
  readonly recordId: string;
  readonly label: string;
  readonly fields: Record<string, unknown>;
  readonly score?: number;
}

export interface GroundedChatMetricRunResult {
  readonly metricId: string;
  readonly name: string;
  readonly values?: Record<string, number>;
  readonly dimensions?: Record<string, unknown>;
  readonly note?: string;
}

export interface GroundedChatDataPorts {
  listEntities(
    tenantId: string,
    userId: string,
  ): Promise<readonly GroundedChatEntitySummary[]>;
  listMetrics(
    tenantId: string,
    userId: string,
  ): Promise<readonly GroundedChatMetricSummary[]>;
  listQueries(
    tenantId: string,
    userId: string,
  ): Promise<readonly GroundedChatQuerySummary[]>;
  /** Keyword / substring search (legacy name also accepted by planner). */
  searchRecords(
    tenantId: string,
    userId: string,
    args: {
      readonly entityName: string;
      readonly q?: string;
      readonly limit?: number;
    },
  ): Promise<readonly GroundedChatRecordHit[]>;
  keywordSearchRecords?(
    tenantId: string,
    userId: string,
    args: {
      readonly entityName: string;
      readonly q?: string;
      readonly limit?: number;
    },
  ): Promise<readonly GroundedChatRecordHit[]>;
  semanticSearchRecords?(
    tenantId: string,
    userId: string,
    args: {
      readonly entityName: string;
      readonly queryText: string;
      readonly topK?: number;
    },
  ): Promise<readonly GroundedChatRecordHit[]>;
  getRecord(
    tenantId: string,
    userId: string,
    args: { readonly entityName: string; readonly recordId: string },
  ): Promise<GroundedChatRecordHit | null>;
  getUserMemoryFacts(
    tenantId: string,
    userId: string,
    args?: { readonly keys?: readonly string[] },
  ): Promise<
    readonly {
      readonly key: string;
      readonly value: string;
      readonly entityRefs: readonly {
        readonly entityName: string;
        readonly recordId: string;
      }[];
    }[]
  >;
  runSavedQuery?(
    tenantId: string,
    userId: string,
    args: { readonly queryId: string; readonly limit?: number },
  ): Promise<readonly GroundedChatRecordHit[]>;
  runMetric?(
    tenantId: string,
    userId: string,
    args: { readonly metricId: string },
  ): Promise<GroundedChatMetricRunResult | null>;
}

export interface GroundedChatToolResult {
  readonly name: GroundedChatToolName;
  readonly ok: boolean;
  readonly result: unknown;
  readonly citations: readonly GroundedChatCitation[];
  readonly error?: string;
  readonly retrievalTop1Score?: number;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function asPositiveInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.min(Math.trunc(value), 50)
    : fallback;
}

async function runKeywordSearch(
  ports: GroundedChatDataPorts,
  tenantId: string,
  userId: string,
  args: {
    readonly entityName: string;
    readonly q?: string;
    readonly limit?: number;
  },
): Promise<readonly GroundedChatRecordHit[]> {
  if (ports.keywordSearchRecords) {
    return ports.keywordSearchRecords(tenantId, userId, args);
  }
  return ports.searchRecords(tenantId, userId, args);
}

export async function executeGroundedChatTool(
  ports: GroundedChatDataPorts,
  tenantId: string,
  userId: string,
  call: GroundedChatToolCall,
): Promise<GroundedChatToolResult> {
  try {
    switch (call.name) {
      case "listEntities": {
        const entities = await ports.listEntities(tenantId, userId);
        return {
          name: call.name,
          ok: true,
          result: entities,
          citations: [],
        };
      }
      case "listMetrics": {
        const metrics = await ports.listMetrics(tenantId, userId);
        return {
          name: call.name,
          ok: true,
          result: metrics,
          citations: metrics.map((m) => ({
            kind: "metric" as const,
            metricId: m.id,
            label: m.name,
          })),
        };
      }
      case "listQueries": {
        const queries = await ports.listQueries(tenantId, userId);
        return {
          name: call.name,
          ok: true,
          result: queries,
          citations: queries.map((q) => ({
            kind: "query" as const,
            queryId: q.id,
            label: q.name,
          })),
        };
      }
      case "searchRecords":
      case "keywordSearchRecords": {
        const entityName = asString(call.args.entityName);
        if (!entityName) {
          return {
            name: call.name,
            ok: false,
            result: null,
            citations: [],
            error: "entityName is required",
          };
        }
        const hits = await runKeywordSearch(ports, tenantId, userId, {
          entityName,
          q: asString(call.args.q),
          limit: asPositiveInt(call.args.limit, 10),
        });
        return {
          name: call.name,
          ok: true,
          result: hits,
          citations: hits.map((h) => ({
            kind: "entity" as const,
            entityName: h.entityName,
            recordId: h.recordId,
            label: h.label,
          })),
        };
      }
      case "semanticSearchRecords": {
        const entityName = asString(call.args.entityName);
        const queryText =
          asString(call.args.queryText) ?? asString(call.args.q);
        if (!entityName || !queryText) {
          return {
            name: call.name,
            ok: false,
            result: null,
            citations: [],
            error: "entityName and queryText are required",
          };
        }
        if (!ports.semanticSearchRecords) {
          const fallback = await runKeywordSearch(ports, tenantId, userId, {
            entityName,
            q: queryText,
            limit: asPositiveInt(call.args.topK ?? call.args.limit, 10),
          });
          return {
            name: call.name,
            ok: true,
            result: fallback,
            citations: fallback.map((h) => ({
              kind: "entity" as const,
              entityName: h.entityName,
              recordId: h.recordId,
              label: h.label,
            })),
          };
        }
        const hits = await ports.semanticSearchRecords(tenantId, userId, {
          entityName,
          queryText,
          topK: asPositiveInt(call.args.topK ?? call.args.limit, 10),
        });
        return {
          name: call.name,
          ok: true,
          result: hits,
          citations: hits.map((h) => ({
            kind: "entity" as const,
            entityName: h.entityName,
            recordId: h.recordId,
            label: h.label,
          })),
          ...(hits[0]?.score != null
            ? { retrievalTop1Score: hits[0].score }
            : {}),
        };
      }
      case "getRecord": {
        const entityName = asString(call.args.entityName);
        const recordId = asString(call.args.recordId);
        if (!entityName || !recordId) {
          return {
            name: call.name,
            ok: false,
            result: null,
            citations: [],
            error: "entityName and recordId are required",
          };
        }
        const hit = await ports.getRecord(tenantId, userId, {
          entityName,
          recordId,
        });
        if (!hit) {
          return {
            name: call.name,
            ok: true,
            result: null,
            citations: [],
          };
        }
        return {
          name: call.name,
          ok: true,
          result: hit,
          citations: [
            {
              kind: "entity",
              entityName: hit.entityName,
              recordId: hit.recordId,
              label: hit.label,
            },
          ],
        };
      }
      case "getUserMemoryFacts": {
        const keys = Array.isArray(call.args.keys)
          ? call.args.keys.filter(
              (k): k is string => typeof k === "string" && k.trim().length > 0,
            )
          : undefined;
        const facts = await ports.getUserMemoryFacts(tenantId, userId, {
          keys,
        });
        return {
          name: call.name,
          ok: true,
          result: facts,
          citations: facts.map((f) => ({
            kind: "memory" as const,
            label: f.key,
          })),
        };
      }
      case "runSavedQuery": {
        const queryId = asString(call.args.queryId);
        if (!queryId) {
          return {
            name: call.name,
            ok: false,
            result: null,
            citations: [],
            error: "queryId is required",
          };
        }
        if (!ports.runSavedQuery) {
          return {
            name: call.name,
            ok: false,
            result: null,
            citations: [],
            error: "runSavedQuery is unavailable",
          };
        }
        const hits = await ports.runSavedQuery(tenantId, userId, {
          queryId,
          limit: asPositiveInt(call.args.limit, 10),
        });
        return {
          name: call.name,
          ok: true,
          result: hits,
          citations: [
            { kind: "query" as const, queryId, label: queryId },
            ...hits.map((h) => ({
              kind: "entity" as const,
              entityName: h.entityName,
              recordId: h.recordId,
              label: h.label,
            })),
          ],
        };
      }
      case "runMetric": {
        const metricId = asString(call.args.metricId);
        if (!metricId) {
          return {
            name: call.name,
            ok: false,
            result: null,
            citations: [],
            error: "metricId is required",
          };
        }
        if (!ports.runMetric) {
          return {
            name: call.name,
            ok: false,
            result: null,
            citations: [],
            error: "runMetric is unavailable",
          };
        }
        const result = await ports.runMetric(tenantId, userId, { metricId });
        return {
          name: call.name,
          ok: true,
          result,
          citations: result
            ? [
                {
                  kind: "metric" as const,
                  metricId: result.metricId,
                  label: result.name,
                },
              ]
            : [],
        };
      }
      default: {
        const exhaustive: never = call.name;
        return {
          name: exhaustive,
          ok: false,
          result: null,
          citations: [],
          error: `Unknown tool: ${String(exhaustive)}`,
        };
      }
    }
  } catch (error) {
    return {
      name: call.name,
      ok: false,
      result: null,
      citations: [],
      error: error instanceof Error ? error.message : "Tool execution failed",
    };
  }
}

export function toAiChatCitations(
  citations: readonly GroundedChatCitation[],
): AiChatCitation[] {
  return citations.map((c) => ({
    kind: c.kind,
    label: c.label,
    ...(c.entityName ? { entityName: c.entityName } : {}),
    ...(c.recordId ? { recordId: c.recordId } : {}),
    ...(c.metricId ? { metricId: c.metricId } : {}),
    ...(c.queryId ? { queryId: c.queryId } : {}),
  }));
}

export function mergeCitations(
  ...groups: readonly (readonly GroundedChatCitation[])[]
): GroundedChatCitation[] {
  const seen = new Set<string>();
  const out: GroundedChatCitation[] = [];
  for (const group of groups) {
    for (const c of group) {
      const key = [
        c.kind,
        c.entityName ?? "",
        c.recordId ?? "",
        c.metricId ?? "",
        c.queryId ?? "",
        c.label,
      ].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
      if (out.length >= 50) return out;
    }
  }
  return out;
}
