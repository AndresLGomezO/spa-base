import { z } from "zod";

import type { DefinedEntity, FieldDefinitions } from "../types.js";
import type { EntityUIConfig } from "./types.js";

const fieldComponentSchema = z.enum([
  "input",
  "number",
  "toggle",
  "date",
  "relation",
  "select",
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

  return parsed;
}
