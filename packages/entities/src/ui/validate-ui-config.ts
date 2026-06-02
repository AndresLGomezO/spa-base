import { z } from "zod";

import type { DefinedEntity, FieldDefinitions } from "../types.js";
import { assertCardLayoutFieldPaths } from "./card-layout-validation.js";
import type { CardLayoutConfig } from "./card-layout-types.js";
import {
  cardMetricKpiSlotBindingSchema,
  viewMetricWidgetSchema,
} from "./metric-widget-types.js";
import type { EntityUIConfig, SerializableEntityDefinition } from "./types.js";

const fieldComponentSchema = z.enum([
  "input",
  "number",
  "toggle",
  "date",
  "relation",
  "select",
  "image",
  "document",
]);

const fieldUISchema = z
  .object({
    label: z.string().trim().min(1).optional(),
    component: fieldComponentSchema.optional(),
    displayFormat: z.enum(["currency", "plain", "percentage"]).optional(),
    dateDisplayFormat: z.enum(["date", "datetime", "time"]).optional(),
    order: z.number().int().nonnegative().optional(),
    placeholder: z.string().optional(),
    visible: z.boolean().optional(),
    editable: z.boolean().optional(),
    filterable: z.boolean().optional(),
    sortable: z.boolean().optional(),
    searchable: z.boolean().optional(),
  })
  .strict();

const filterUISchema = z
  .object({
    field: z.string().trim().min(1),
    operator: z.enum(["==", "!=", "<", "<=", ">", ">=", "in"]).optional(),
    label: z.string().trim().min(1).optional(),
  })
  .strict();

const layoutAlignSchema = z.enum(["start", "center", "end", "stretch"]);
const layoutJustifySchema = z.enum(["start", "center", "end", "between"]);
const layoutDirectionSchema = z.enum(["row", "column"]);
const layoutSizeSchema = z.union([z.number(), z.string()]);
const cardFieldSlotComponentSchema = z.enum([
  "text",
  "labeled-text",
  "image",
  "badge",
  "currency",
]);
const cardBadgeVariantSchema = z.enum([
  "success",
  "warning",
  "danger",
  "info",
  "default",
  "active",
  "pending",
  "closed",
  "neutral",
]);

const layoutNodeBaseSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    className: z.string().optional(),
    minWidth: layoutSizeSchema.optional(),
    maxWidth: layoutSizeSchema.optional(),
    minHeight: layoutSizeSchema.optional(),
    maxHeight: layoutSizeSchema.optional(),
    flex: z.union([z.number(), z.string()]).optional(),
    align: layoutAlignSchema.optional(),
    justify: layoutJustifySchema.optional(),
  })
  .strict();

const cardFieldSlotBindingSchema = z
  .object({
    component: cardFieldSlotComponentSchema,
    fieldPath: z.string().trim().min(1),
    showLabel: z.boolean().optional(),
    label: z.string().optional(),
    className: z.string().optional(),
    imageSize: z.number().int().min(24).max(96).optional(),
    textSize: z.number().int().min(10).max(32).optional(),
    textThin: z.boolean().optional(),
    textBold: z.boolean().optional(),
    textItalic: z.boolean().optional(),
    textUnderline: z.boolean().optional(),
    badgeVariants: z.record(z.string(), cardBadgeVariantSchema).optional(),
  })
  .strict();

const cardSlotBindingSchema = z.union([
  cardFieldSlotBindingSchema,
  cardMetricKpiSlotBindingSchema,
]);

const layoutNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.discriminatedUnion("type", [
    layoutNodeBaseSchema
      .extend({
        type: z.literal("slot"),
        slotId: z.string().trim().min(1),
      })
      .strict(),
    layoutNodeBaseSchema
      .extend({
        type: z.enum(["grid", "stack"]),
        direction: layoutDirectionSchema.optional(),
        gap: z.number().nonnegative().optional(),
        columns: z.union([z.number().int().positive(), z.string()]).optional(),
        children: z.array(layoutNodeSchema).min(1),
      })
      .strict(),
  ]),
);

const cardLayoutConfigSchema = z
  .object({
    root: layoutNodeSchema,
    slots: z.record(z.string(), cardSlotBindingSchema),
    showActions: z.boolean().optional(),
    cardsPerRow: z.number().int().min(1).max(4).optional(),
  })
  .strict();

const viewConfigSchema = z
  .object({
    type: z.enum(["table", "card"]),
    name: z.string().trim().min(1),
    fields: z.array(z.string().trim().min(1)).min(1),
    filters: z.array(filterUISchema).optional(),
    defaultSort: z
      .object({
        field: z.string().trim().min(1),
        direction: z.enum(["asc", "desc"]),
      })
      .strict()
      .optional(),
    layout: cardLayoutConfigSchema.optional(),
    metricWidgets: z.array(viewMetricWidgetSchema).optional(),
  })
  .strict();

const formSectionSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    fields: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

const formLayoutSchema = z
  .object({
    sections: z.array(formSectionSchema).min(1),
  })
  .strict();

const entityUISchema = z
  .object({
    views: z.array(viewConfigSchema).min(1),
    listViewType: z.enum(["table", "card"]).optional(),
    forms: z
      .object({
        create: formLayoutSchema,
        edit: formLayoutSchema,
      })
      .strict(),
    detail: z
      .object({
        fields: z.array(z.string().trim().min(1)).min(1),
      })
      .strict()
      .optional(),
    nav: z
      .object({
        label: z.string().trim().min(1),
        icon: z.string().trim().min(1).optional(),
      })
      .strict()
      .optional(),
    fields: z.record(z.string(), fieldUISchema).optional(),
  })
  .strict();

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

const SYSTEM_FIELDS = new Set(["id", "tenantId", "createdAt", "updatedAt"]);

function isQueryableField(
  entity: AnyDefinedEntity,
  fieldName: string,
): boolean {
  if (fieldName === "id" || fieldName === "createdAt") {
    return true;
  }
  if (SYSTEM_FIELDS.has(fieldName)) {
    return false;
  }
  return fieldName in entity.metadata.fields;
}

function assertFieldRefs(
  entity: AnyDefinedEntity,
  fieldNames: readonly string[],
  context: string,
): void {
  for (const fieldName of fieldNames) {
    if (!isQueryableField(entity, fieldName)) {
      throw new Error(
        `Invalid ${context} field "${fieldName}" for entity "${entity.name}".`,
      );
    }
  }
}

export function validateEntityUIConfig(
  entity: AnyDefinedEntity,
  ui: EntityUIConfig,
): EntityUIConfig {
  const parsed = entityUISchema.parse(ui);

  for (const view of parsed.views) {
    assertFieldRefs(entity, view.fields, `view "${view.name}"`);
    for (const filter of view.filters ?? []) {
      assertFieldRefs(entity, [filter.field], `filter in view "${view.name}"`);
    }
    if (view.defaultSort) {
      assertFieldRefs(
        entity,
        [view.defaultSort.field],
        `defaultSort in view "${view.name}"`,
      );
    }
    if (view.layout) {
      assertCardLayoutFieldPaths(
        {
          name: entity.name,
          collection: entity.metadata.collection,
          permissions: entity.metadata.permissions,
          fields: Object.fromEntries(
            Object.entries(entity.metadata.fields).map(([key, field]) => [
              key,
              {
                type: field.type,
                required: field.required,
                optional: field.optional,
                ...(field.relation
                  ? {
                      relation: {
                        target: field.relation.target,
                        type: field.relation.type,
                        ...(field.relation.onDelete
                          ? { onDelete: field.relation.onDelete }
                          : {}),
                        ...(field.relation.joinCollection
                          ? { joinCollection: field.relation.joinCollection }
                          : {}),
                      },
                    }
                  : {}),
              },
            ]),
          ),
          ui: parsed as EntityUIConfig,
        } as SerializableEntityDefinition,
        view.layout as CardLayoutConfig,
        `view "${view.name}"`,
      );
    }
  }

  for (const mode of ["create", "edit"] as const) {
    for (const section of parsed.forms[mode].sections) {
      assertFieldRefs(entity, section.fields, `${mode} form`);
    }
  }

  if (parsed.detail) {
    assertFieldRefs(entity, parsed.detail.fields, "detail");
  }

  if (parsed.fields) {
    for (const fieldName of Object.keys(parsed.fields)) {
      if (!(fieldName in entity.metadata.fields)) {
        throw new Error(
          `Invalid field UI config for unknown field "${fieldName}" on entity "${entity.name}".`,
        );
      }
    }
  }

  return parsed as EntityUIConfig;
}
