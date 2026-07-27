import {
  uiLayoutDocumentSchema,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { z } from "zod";

import type {
  EntityUiOverrideForms,
  FormDesignDefinition,
} from "./form-config.js";
import { metricWidgetsSchema } from "./metric-widget-types.js";
import type {
  EntityUiOverrideRecord,
  LegacyEntityListViewType,
} from "./types.js";
import type { MetricWidgetDefinition } from "./metric-widget-types.js";

export const ENTITY_UI_OVERRIDES_COLLECTION = "entity_ui_overrides";

const wizardStepConfigSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    subtitle: z.string().trim().min(1).optional(),
    icon: z.string().trim().min(1).optional(),
    layout: uiLayoutDocumentSchema,
  })
  .strict();

const wizardFormConfigSchema = z
  .object({
    shellLayout: uiLayoutDocumentSchema,
    steps: z.array(wizardStepConfigSchema),
  })
  .strict();

const formModalChromeSchema = z
  .object({
    showHeader: z.boolean().optional(),
    contentPadding: z.enum(["default", "none"]).optional(),
  })
  .strict();

export const formDesignDefinitionSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    presentation: z.enum(["plain", "wizard"]).optional(),
    layout: uiLayoutDocumentSchema.optional(),
    wizard: wizardFormConfigSchema.optional(),
    modalSize: z.enum(["sm", "md", "lg", "xl", "2xl"]).optional(),
    modalSizeByBreakpoint: z
      .object({
        base: z.enum(["sm", "md", "lg", "xl", "2xl"]).optional(),
        sm: z.enum(["sm", "md", "lg", "xl", "2xl"]).optional(),
        md: z.enum(["sm", "md", "lg", "xl", "2xl"]).optional(),
        lg: z.enum(["sm", "md", "lg", "xl", "2xl"]).optional(),
        xl: z.enum(["sm", "md", "lg", "xl", "2xl"]).optional(),
      })
      .strict()
      .optional(),
    modalChrome: formModalChromeSchema.optional(),
    modalFooterLayout: uiLayoutDocumentSchema.optional(),
  })
  .strict();

export const uiOverrideFormsSchema = z
  .object({
    presentation: z.enum(["plain", "wizard"]).optional(),
    layout: uiLayoutDocumentSchema.optional(),
    wizard: wizardFormConfigSchema.optional(),
    modalSize: z.enum(["sm", "md", "lg", "xl", "2xl"]).optional(),
    modalSizeByBreakpoint: z
      .object({
        base: z.enum(["sm", "md", "lg", "xl", "2xl"]).optional(),
        sm: z.enum(["sm", "md", "lg", "xl", "2xl"]).optional(),
        md: z.enum(["sm", "md", "lg", "xl", "2xl"]).optional(),
        lg: z.enum(["sm", "md", "lg", "xl", "2xl"]).optional(),
        xl: z.enum(["sm", "md", "lg", "xl", "2xl"]).optional(),
      })
      .strict()
      .optional(),
    modalChrome: formModalChromeSchema.optional(),
    modalFooterLayout: uiLayoutDocumentSchema.optional(),
    create: uiLayoutDocumentSchema.optional(),
    edit: uiLayoutDocumentSchema.optional(),
  })
  .strict();

export const entityUiOverrideRecordSchema = z
  .object({
    entityName: z.string().trim().min(1),
    views: z.array(z.unknown()).min(1),
    listViewType: z.enum(["card", "expandableTable", "compact"]).optional(),
    listItem: uiLayoutDocumentSchema.optional(),
    mainPage: uiLayoutDocumentSchema.optional(),
    recordDetail: uiLayoutDocumentSchema.optional(),
    /** @deprecated Use recordDetail; read-only alias for migration */
    detail: uiLayoutDocumentSchema.optional(),
    metricWidgets: metricWidgetsSchema.optional(),
    metricRowLayout: uiLayoutDocumentSchema.optional(),
    forms: uiOverrideFormsSchema.optional(),
    formDesigns: z.array(formDesignDefinitionSchema).optional(),
    entityPageCreateFormDesignId: z.string().trim().min(1).optional(),
    entityPageEditFormDesignId: z.string().trim().min(1).optional(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const putEntityUiOverrideInputSchema = z
  .object({
    views: z.array(z.unknown()).min(1),
    listViewType: z.enum(["card", "expandableTable", "compact"]).optional(),
    listItem: uiLayoutDocumentSchema.optional(),
    mainPage: uiLayoutDocumentSchema.optional(),
    recordDetail: uiLayoutDocumentSchema.optional(),
    metricWidgets: metricWidgetsSchema.optional(),
    metricRowLayout: uiLayoutDocumentSchema.optional(),
    forms: uiOverrideFormsSchema.optional(),
    formDesigns: z.array(formDesignDefinitionSchema).optional(),
    entityPageCreateFormDesignId: z
      .union([z.string().trim().min(1), z.null()])
      .optional(),
    entityPageEditFormDesignId: z
      .union([z.string().trim().min(1), z.null()])
      .optional(),
  })
  .strict();

export interface PutEntityUiOverrideInput {
  readonly views: readonly unknown[];
  readonly listViewType?: LegacyEntityListViewType;
  readonly listItem?: UiLayoutDocument;
  readonly mainPage?: UiLayoutDocument;
  readonly recordDetail?: UiLayoutDocument;
  readonly metricWidgets?: readonly MetricWidgetDefinition[];
  readonly metricRowLayout?: UiLayoutDocument;
  readonly forms?: EntityUiOverrideForms;
  readonly formDesigns?: readonly FormDesignDefinition[];
  /** `null` clears a previously saved entity-page default. */
  readonly entityPageCreateFormDesignId?: string | null;
  /** `null` clears a previously saved entity-page default. */
  readonly entityPageEditFormDesignId?: string | null;
}

function toRecordInput(
  entityName: string,
  data: unknown,
): Record<string, unknown> {
  return {
    entityName,
    ...(typeof data === "object" && data !== null ? data : {}),
  };
}

export function parseEntityUiOverrideRecord(
  entityName: string,
  data: unknown,
): EntityUiOverrideRecord {
  return entityUiOverrideRecordSchema.parse(
    toRecordInput(entityName, data),
  ) as EntityUiOverrideRecord;
}

export function buildEntityUiOverrideRecordFromPutInput(
  entityName: string,
  input: PutEntityUiOverrideInput,
  updatedAt: string = new Date().toISOString(),
): EntityUiOverrideRecord {
  return parseEntityUiOverrideRecord(entityName, {
    views: input.views,
    ...(input.listViewType ? { listViewType: input.listViewType } : {}),
    ...(input.listItem ? { listItem: input.listItem } : {}),
    ...(input.mainPage ? { mainPage: input.mainPage } : {}),
    ...(input.recordDetail ? { recordDetail: input.recordDetail } : {}),
    ...(input.metricWidgets !== undefined
      ? { metricWidgets: input.metricWidgets }
      : {}),
    ...(input.metricRowLayout !== undefined
      ? { metricRowLayout: input.metricRowLayout }
      : {}),
    ...(input.forms ? { forms: input.forms } : {}),
    ...(input.formDesigns !== undefined
      ? { formDesigns: input.formDesigns }
      : {}),
    ...(input.entityPageCreateFormDesignId
      ? { entityPageCreateFormDesignId: input.entityPageCreateFormDesignId }
      : {}),
    ...(input.entityPageEditFormDesignId
      ? { entityPageEditFormDesignId: input.entityPageEditFormDesignId }
      : {}),
    updatedAt,
  });
}

/** Returns null when Firestore data no longer matches the current schema. */
export function safeParseEntityUiOverrideRecord(
  entityName: string,
  data: unknown,
): EntityUiOverrideRecord | null {
  const parsed = entityUiOverrideRecordSchema.safeParse(
    toRecordInput(entityName, data),
  );
  return parsed.success ? (parsed.data as EntityUiOverrideRecord) : null;
}
