import { z } from "zod";

export const INSIGHT_SURFACES_COLLECTION =
  "__insight_surface_definitions" as const;

export const INSIGHT_SURFACE_DEFINITION_JSON_VERSION = 1 as const;
export const INSIGHT_SURFACE_DEFINITION_JSON_KIND =
  "insight-surface-definition" as const;
export const INSIGHT_SURFACES_CATALOG_JSON_KIND =
  "insight-surfaces-catalog" as const;

const localeLabelMapSchema = z.record(z.string().trim().min(1), z.string());

const surfaceLabelsSchema = z
  .object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
    emptyScope: z.string().trim().min(1).optional(),
    seeAll: z.string().trim().min(1).optional(),
    refreshAction: z.string().trim().min(1).optional(),
    portfolioNarrativeTitle: z.string().trim().min(1).optional(),
    summary: localeLabelMapSchema.optional(),
  })
  .strict();

const localizedLabelsSchema = z.record(
  z.string().trim().min(1),
  surfaceLabelsSchema,
);

const linkFieldSchema = z
  .object({
    field: z.string().trim().min(1),
    entity: z.string().trim().min(1),
  })
  .strict();

const summaryFieldSchema = z
  .object({
    path: z.string().trim().min(1),
    labelKey: z.string().trim().min(1),
    format: z.enum(["currency", "number", "count"]).default("number"),
  })
  .strict();

const entitySummarySourceSchema = z
  .object({
    entity: z.string().trim().min(1),
    matchField: z.string().trim().min(1),
    fields: z.array(summaryFieldSchema).min(1),
  })
  .strict();

export const insightSurfaceBodySchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-z][a-z0-9_-]*$/i, "Surface id must be alphanumeric"),
    labels: localizedLabelsSchema,
    icon: z.string().trim().min(1).optional(),
    permission: z.string().trim().min(1).default("ai.chat.run"),
    chat: z
      .object({
        toolDescription: z.string().trim().min(1),
        progressLabel: z.record(
          z.string().trim().min(1),
          z.string().trim().min(1),
        ),
      })
      .strict(),
    insight: z
      .object({
        entity: z.string().trim().min(1),
        narrativeVariant: z.string().trim().min(1).default("insights"),
        topN: z.number().int().positive().max(50).default(5),
        titleField: z.string().trim().min(1).default("title"),
        rankField: z.string().trim().min(1).default("rank"),
        impactScoreField: z.string().trim().min(1).default("impactScore"),
        linkFields: z.array(linkFieldSchema).default([]),
      })
      .strict(),
    scope: z
      .object({
        field: z.string().trim().min(1),
        queryParam: z.string().trim().min(1),
        format: z.literal("YYYY-MM").default("YYYY-MM"),
      })
      .strict(),
    portfolio: z
      .object({
        entity: z.string().trim().min(1),
        recordId: z.string().trim().min(1),
        narrativeVariant: z.string().trim().min(1),
        signalsField: z.string().trim().min(1),
        signalsUpdatedAtField: z.string().trim().min(1).optional(),
        currencyField: z.string().trim().min(1).default("currencyBase"),
      })
      .strict(),
    summary: z
      .object({
        entitySource: entitySummarySourceSchema.optional(),
        signalFields: z.array(summaryFieldSchema).default([]),
      })
      .strict()
      .default({ signalFields: [] }),
    ui: z
      .object({
        showInHome: z.boolean().default(true),
        homeOrder: z.number().int().default(0),
        tabOrder: z.number().int().default(0),
      })
      .strict()
      .default({ showInHome: true, homeOrder: 0, tabOrder: 0 }),
  })
  .strict();

export type InsightSurfaceBody = z.infer<typeof insightSurfaceBodySchema>;

export const createInsightSurfaceInputSchema = insightSurfaceBodySchema;

export type CreateInsightSurfaceInput = z.infer<
  typeof createInsightSurfaceInputSchema
>;

export const patchInsightSurfaceInputSchema = insightSurfaceBodySchema
  .partial()
  .omit({ id: true })
  .strict();

export type PatchInsightSurfaceInput = z.infer<
  typeof patchInsightSurfaceInputSchema
>;

export const insightSurfaceRecordSchema = insightSurfaceBodySchema
  .extend({
    tenantId: z.string().trim().min(1),
    version: z.number().int().positive().default(1),
    createdAt: z.string().trim().min(1),
    updatedAt: z.string().trim().min(1),
  })
  .strict();

export type InsightSurfaceDefinition = z.infer<
  typeof insightSurfaceRecordSchema
>;

export type InsightSurfaceLabels = z.infer<typeof surfaceLabelsSchema>;
export type InsightSurfaceSummaryField = z.infer<typeof summaryFieldSchema>;
