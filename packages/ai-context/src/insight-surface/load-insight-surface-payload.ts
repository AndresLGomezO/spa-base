import type { AiRecordSummaryRepository } from "../storage/ai-record-summary.schema.js";
import { readAiRecordSummaryField } from "../storage/read-ai-record-summary-field.js";
import type { InsightSurfaceDefinition } from "./insight-surface-definition.js";
import { resolveSurfaceLabels } from "./insight-surface-definition-json.js";

type GenericRecord = {
  readonly id: string;
  readonly tenantId: string;
  readonly [key: string]: unknown;
};

export interface InsightSurfaceEntityRepository {
  findById(id: string, tenantId: string): Promise<GenericRecord | null>;
  findAll(params: {
    readonly tenantId: string;
    readonly limit?: number;
  }): Promise<{ readonly items: readonly GenericRecord[] }>;
}

export interface LoadInsightSurfacePayloadDeps {
  readonly getRepository: (
    tenantId: string,
    entityName: string,
  ) => InsightSurfaceEntityRepository | undefined;
  readonly isTenantWideRead: (tenantId: string, entityName: string) => boolean;
  readonly aiRecordSummaryRepository: Pick<AiRecordSummaryRepository, "get">;
}

export interface InsightSurfacePayload {
  readonly surfaceId: string;
  readonly scope: string;
  readonly currency?: string;
  readonly summary: Readonly<Record<string, number>>;
  readonly insights: readonly {
    readonly recordId: string;
    readonly title: string;
    readonly rank?: number;
    readonly impactScore?: number;
    readonly links: Readonly<Record<string, string>>;
    readonly narrative?: string;
  }[];
  readonly portfolioNarrative?: string;
  readonly portfolioNarrativeUpdatedAt?: string;
  readonly labels: ReturnType<typeof resolveSurfaceLabels>;
  readonly ui: InsightSurfaceDefinition["ui"];
  readonly scopeConfig: InsightSurfaceDefinition["scope"];
  readonly summaryFields: readonly {
    readonly path: string;
    readonly labelKey: string;
    readonly format: "currency" | "number" | "count";
  }[];
  readonly linkFields: InsightSurfaceDefinition["insight"]["linkFields"];
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
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

function parseSignalsJson(
  raw: unknown,
): Readonly<Record<string, number | undefined>> {
  if (typeof raw !== "string" || !raw.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, number | undefined> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const num = asFiniteNumber(value);
      if (num != null) out[key] = num;
    }
    return out;
  } catch {
    return {};
  }
}

export async function loadInsightSurfacePayload(
  options: LoadInsightSurfacePayloadDeps,
  input: {
    readonly tenantId: string;
    readonly userId: string;
    readonly surface: InsightSurfaceDefinition;
    readonly scope: string;
    readonly locale?: string;
  },
): Promise<InsightSurfacePayload> {
  const { surface, tenantId, userId, scope } = input;
  const locale = input.locale ?? "en";
  const labels = resolveSurfaceLabels(surface, locale);

  let currency: string | undefined;
  let portfolioNarrative: string | undefined;
  let portfolioNarrativeUpdatedAt: string | undefined;
  const summary: Record<string, number> = {};

  const portfolioRepo = options.getRepository(
    tenantId,
    surface.portfolio.entity,
  );
  if (portfolioRepo) {
    const settings = await portfolioRepo.findById(
      surface.portfolio.recordId,
      tenantId,
    );
    if (
      settings &&
      userCanSee(
        settings,
        userId,
        options.isTenantWideRead(tenantId, surface.portfolio.entity),
      )
    ) {
      currency = asOptionalString(settings[surface.portfolio.currencyField]);
      const signals = parseSignalsJson(
        settings[surface.portfolio.signalsField],
      );
      for (const field of surface.summary.signalFields) {
        const value = signals[field.path];
        if (value != null) summary[field.path] = value;
      }
      const aiDoc = await options.aiRecordSummaryRepository.get(
        tenantId,
        surface.portfolio.entity,
        settings.id,
      );
      portfolioNarrative = readAiRecordSummaryField(
        aiDoc,
        `narratives.${surface.portfolio.narrativeVariant}.text`,
      );
      portfolioNarrativeUpdatedAt =
        aiDoc?.narratives?.[surface.portfolio.narrativeVariant]?.updatedAt;
    }
  }

  const entitySource = surface.summary.entitySource;
  if (entitySource) {
    const summaryRepo = options.getRepository(tenantId, entitySource.entity);
    if (summaryRepo) {
      const page = await summaryRepo.findAll({ tenantId, limit: 40 });
      const tenantWide = options.isTenantWideRead(
        tenantId,
        entitySource.entity,
      );
      const match = page.items.find(
        (record) =>
          asOptionalString(record[entitySource.matchField]) === scope &&
          userCanSee(record, userId, tenantWide),
      );
      if (match) {
        for (const field of entitySource.fields) {
          if (field.path === "netCashflow") {
            const income = asFiniteNumber(match.totalIncome);
            const expenses = asFiniteNumber(match.totalExpenses);
            if (income != null && expenses != null) {
              summary.netCashflow = income - expenses;
              continue;
            }
          }
          const value = asFiniteNumber(match[field.path]);
          if (value != null) summary[field.path] = value;
        }
      }
    }
  }

  const insightRepo = options.getRepository(tenantId, surface.insight.entity);
  const insights: Array<InsightSurfacePayload["insights"][number]> = [];
  if (insightRepo) {
    const page = await insightRepo.findAll({ tenantId, limit: 100 });
    const tenantWide = options.isTenantWideRead(
      tenantId,
      surface.insight.entity,
    );
    const ranked = page.items
      .filter(
        (record) =>
          asOptionalString(record[surface.scope.field]) === scope &&
          userCanSee(record, userId, tenantWide),
      )
      .sort((a, b) => {
        const rankA =
          asFiniteNumber(a[surface.insight.rankField]) ??
          Number.POSITIVE_INFINITY;
        const rankB =
          asFiniteNumber(b[surface.insight.rankField]) ??
          Number.POSITIVE_INFINITY;
        if (rankA !== rankB) return rankA - rankB;
        const impactA =
          asFiniteNumber(a[surface.insight.impactScoreField]) ??
          Number.NEGATIVE_INFINITY;
        const impactB =
          asFiniteNumber(b[surface.insight.impactScoreField]) ??
          Number.NEGATIVE_INFINITY;
        return impactB - impactA;
      })
      .slice(0, surface.insight.topN);

    for (const record of ranked) {
      const title =
        asOptionalString(record[surface.insight.titleField]) ??
        asOptionalString(record.summary) ??
        record.id;
      const aiDoc = await options.aiRecordSummaryRepository.get(
        tenantId,
        surface.insight.entity,
        record.id,
      );
      const narrative = readAiRecordSummaryField(
        aiDoc,
        `narratives.${surface.insight.narrativeVariant}.text`,
      );
      const links: Record<string, string> = {};
      for (const link of surface.insight.linkFields) {
        const value = asOptionalString(record[link.field]);
        if (value) links[link.field] = value;
      }
      insights.push({
        recordId: record.id,
        title,
        links,
        ...(asFiniteNumber(record[surface.insight.rankField]) != null
          ? { rank: asFiniteNumber(record[surface.insight.rankField]) }
          : {}),
        ...(asFiniteNumber(record[surface.insight.impactScoreField]) != null
          ? {
              impactScore: asFiniteNumber(
                record[surface.insight.impactScoreField],
              ),
            }
          : {}),
        ...(narrative ? { narrative } : {}),
      });
    }
  }

  const summaryFields = [
    ...(entitySource?.fields ?? []),
    ...surface.summary.signalFields,
  ];

  return {
    surfaceId: surface.id,
    scope,
    ...(currency ? { currency } : {}),
    summary,
    insights,
    ...(portfolioNarrative ? { portfolioNarrative } : {}),
    ...(portfolioNarrativeUpdatedAt ? { portfolioNarrativeUpdatedAt } : {}),
    labels,
    ui: surface.ui,
    scopeConfig: surface.scope,
    summaryFields,
    linkFields: surface.insight.linkFields,
  };
}
