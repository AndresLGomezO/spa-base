import { metricWidgetsSchema } from "@repo/entities";
import { uiLayoutDocumentSchema } from "@repo/ui-builder-core";
import { z } from "zod";

import type {
  EntityListViewType,
  EntityNavConfig,
  FieldUIConfig,
  MetricWidgetDefinition,
  ViewConfig,
} from "@repo/entities";

export { CUSTOM_VIEW_PERMISSIONS } from "./permissions.js";

export const CUSTOM_VIEWS_COLLECTION = "__custom_views" as const;

export const CUSTOM_VIEW_STATUSES = ["ACTIVE", "PAUSED"] as const;
export type CustomViewStatus = (typeof CUSTOM_VIEW_STATUSES)[number];

export interface CustomViewUIConfig {
  readonly views: readonly ViewConfig[];
  readonly listViewType?: EntityListViewType;
  readonly listItem?: import("@repo/ui-builder-core").UiLayoutDocument;
  readonly mainPageLayout?: import("@repo/ui-builder-core").UiLayoutDocument;
  readonly metricRowLayout?: import("@repo/ui-builder-core").UiLayoutDocument;
  readonly metricWidgets?: readonly MetricWidgetDefinition[];
  readonly fields?: Readonly<Record<string, FieldUIConfig>>;
}

export const customViewNavConfigSchema = z
  .object({
    label: z.string().trim().min(1),
    icon: z.string().trim().min(1).optional(),
  })
  .strict();

export const customViewUIConfigSchema = z
  .object({
    views: z.array(z.unknown()).min(1),
    listViewType: z.enum(["table", "card", "expandableTable"]).optional(),
    listItem: uiLayoutDocumentSchema.optional(),
    mainPageLayout: uiLayoutDocumentSchema.optional(),
    metricRowLayout: uiLayoutDocumentSchema.optional(),
    metricWidgets: metricWidgetsSchema.optional(),
    fields: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const customViewBodySchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().trim().optional(),
    viewId: z
      .string()
      .trim()
      .min(1)
      .regex(/^[a-z0-9][a-z0-9_-]*$/i, {
        message:
          "viewId must start with a letter or number and contain only letters, numbers, underscores, or hyphens.",
      })
      .optional(),
    entityQueryDefinitionId: z.string().trim().min(1),
    status: z.enum(CUSTOM_VIEW_STATUSES).default("ACTIVE"),
    hiddenFromNav: z.boolean().optional(),
    navCategoryId: z.string().trim().min(1).optional(),
    navOrder: z.number().int().optional(),
    nav: customViewNavConfigSchema,
    ui: customViewUIConfigSchema,
  })
  .strict();

export const customViewRecordSchema = customViewBodySchema
  .extend({
    id: z.string().trim().min(1),
    tenantId: z.string().trim().min(1),
    sourceEntity: z.string().trim().min(1),
    viewId: z.string().trim().min(1),
    createdAt: z.string().trim().min(1),
    updatedAt: z.string().trim().min(1),
  })
  .strict();

export type CustomViewRecord = z.infer<typeof customViewRecordSchema>;

export const createCustomViewInputSchema = customViewBodySchema
  .omit({ ui: true, nav: true })
  .extend({
    nav: customViewNavConfigSchema.optional(),
    ui: customViewUIConfigSchema.optional(),
  })
  .strict();

export type CreateCustomViewInput = z.infer<typeof createCustomViewInputSchema>;

export const patchCustomViewInputSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    entityQueryDefinitionId: z.string().trim().min(1).optional(),
    status: z.enum(CUSTOM_VIEW_STATUSES).optional(),
    hiddenFromNav: z.boolean().optional(),
    navCategoryId: z.string().trim().min(1).nullable().optional(),
    navOrder: z.number().int().nullable().optional(),
    nav: customViewNavConfigSchema.optional(),
    ui: customViewUIConfigSchema.partial().optional(),
  })
  .strict();

export type PatchCustomViewInput = z.infer<typeof patchCustomViewInputSchema>;

export type CustomViewNavConfig = EntityNavConfig;
