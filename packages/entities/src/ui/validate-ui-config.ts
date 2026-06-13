import { z } from "zod";

import type { DefinedEntity, FieldDefinitions } from "../types.js";
import {
  assertFormLayoutFieldPaths,
  assertLayoutFieldPaths,
  assertWizardShellLayout,
  uiLayoutDocumentSchema,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { metricStripHasContent } from "./metric-strip-placement.js";
import { metricWidgetsSchema } from "./metric-widget-types.js";
import { migrateListPresentation } from "./migrate-list-presentation.js";
import type { EntityUIConfig } from "./types.js";

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

const viewConfigSharedSchema = {
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
};

const groupedTableColumnSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1).optional(),
    displayFrom: z.enum(["base", "sm", "md", "lg", "xl"]).optional(),
    displayTo: z.enum(["base", "sm", "md", "lg", "xl"]).optional(),
    cellLayout: uiLayoutDocumentSchema,
  })
  .strict();

const tableViewConfigSchema = z
  .object({
    type: z.literal("table"),
    ...viewConfigSharedSchema,
    showActions: z.boolean().optional(),
  })
  .strict();

const cardViewConfigSchema = z
  .object({
    type: z.literal("card"),
    ...viewConfigSharedSchema,
    layout: uiLayoutDocumentSchema.optional(),
  })
  .strict();

const expandableTableViewConfigSchema = z
  .object({
    type: z.literal("expandableTable"),
    ...viewConfigSharedSchema,
    columns: z.array(groupedTableColumnSchema).min(1),
    rowExpandLayout: uiLayoutDocumentSchema,
    showActions: z.boolean().optional(),
  })
  .strict();

const viewConfigSchema = z.discriminatedUnion("type", [
  tableViewConfigSchema,
  cardViewConfigSchema,
  expandableTableViewConfigSchema,
]);

const legacyFormSectionSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    fields: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

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
  .strict()
  .superRefine((wizard, ctx) => {
    const ids = new Set<string>();
    for (const [index, step] of wizard.steps.entries()) {
      if (ids.has(step.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate wizard step id "${step.id}".`,
          path: ["steps", index, "id"],
        });
      }
      ids.add(step.id);
    }
  });

const formLayoutSchema = z
  .object({
    layout: uiLayoutDocumentSchema.optional(),
    sections: z.array(legacyFormSectionSchema).min(1).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.layout && !value.sections?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Form layout must define layout or legacy sections.",
      });
    }
  });

const entityUISchema = z
  .object({
    views: z.array(viewConfigSchema).min(1),
    listViewType: z
      .enum(["table", "card", "expandableTable", "compact"])
      .optional(),
    listItem: uiLayoutDocumentSchema.optional(),
    mainPageLayout: uiLayoutDocumentSchema.optional(),
    recordDetailLayout: uiLayoutDocumentSchema.optional(),
    detailLayout: uiLayoutDocumentSchema.optional(),
    forms: z
      .object({
        create: formLayoutSchema,
        edit: formLayoutSchema,
        presentation: z.enum(["plain", "wizard"]).optional(),
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
        modalChrome: z
          .object({
            showHeader: z.boolean().optional(),
            contentPadding: z.enum(["default", "none"]).optional(),
          })
          .strict()
          .optional(),
        modalFooterLayout: uiLayoutDocumentSchema.optional(),
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
    metricWidgets: metricWidgetsSchema.optional(),
    metricRowLayout: uiLayoutDocumentSchema.optional(),
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

  const layoutEntityShape = {
    name: entity.name,
    fields: Object.fromEntries(
      Object.entries(entity.metadata.fields).map(([key, field]) => [
        key,
        {
          type: field.type,
          ...(field.relation
            ? {
                relation: {
                  target: field.relation.target,
                  type: field.relation.type,
                },
              }
            : {}),
        },
      ]),
    ),
  };

  if (parsed.listItem) {
    assertLayoutFieldPaths(
      layoutEntityShape,
      parsed.listItem as UiLayoutDocument,
      "listItem",
    );
  }

  if (parsed.mainPageLayout) {
    assertLayoutFieldPaths(
      layoutEntityShape,
      parsed.mainPageLayout as UiLayoutDocument,
      "mainPageLayout",
    );
  }

  const recordDetailLayout = parsed.recordDetailLayout ?? parsed.detailLayout;
  if (recordDetailLayout) {
    assertLayoutFieldPaths(
      layoutEntityShape,
      recordDetailLayout as UiLayoutDocument,
      "recordDetailLayout",
    );
  }

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
    if (view.type === "card" && view.layout) {
      assertLayoutFieldPaths(
        layoutEntityShape,
        view.layout as UiLayoutDocument,
        `view "${view.name}"`,
      );
    }
    if (view.type === "expandableTable") {
      for (const column of view.columns) {
        assertLayoutFieldPaths(
          layoutEntityShape,
          column.cellLayout as UiLayoutDocument,
          `expandableTable column "${column.id}" in view "${view.name}"`,
        );
      }
      assertLayoutFieldPaths(
        layoutEntityShape,
        view.rowExpandLayout as UiLayoutDocument,
        `expandableTable rowExpandLayout in view "${view.name}"`,
      );
    }
  }

  for (const mode of ["create", "edit"] as const) {
    const formLayout = parsed.forms[mode];
    if (formLayout.layout) {
      assertFormLayoutFieldPaths(
        layoutEntityShape,
        formLayout.layout as UiLayoutDocument,
        `${mode} form layout`,
      );
    } else if (formLayout.sections) {
      for (const section of formLayout.sections) {
        assertFieldRefs(entity, section.fields, `${mode} form`);
      }
    }
  }

  if (parsed.forms.wizard) {
    assertWizardShellLayout(
      parsed.forms.wizard.shellLayout as UiLayoutDocument,
      `forms wizard shell for entity "${entity.name}"`,
      {
        actionsInModalFooter: parsed.forms.modalFooterLayout != null,
      },
    );
    for (const [index, step] of parsed.forms.wizard.steps.entries()) {
      assertFormLayoutFieldPaths(
        layoutEntityShape,
        step.layout as UiLayoutDocument,
        `wizard step ${index + 1} (${step.id})`,
      );
      assertLayoutFieldPaths(
        layoutEntityShape,
        step.layout as UiLayoutDocument,
        `wizard step ${index + 1} (${step.id})`,
      );
    }
  }

  if (parsed.detail) {
    assertFieldRefs(entity, parsed.detail.fields, "detail");
  }

  if (parsed.metricWidgets) {
    for (const [index, widget] of parsed.metricWidgets.entries()) {
      if (metricStripHasContent(widget.layout as UiLayoutDocument)) {
        assertLayoutFieldPaths(
          layoutEntityShape,
          widget.layout as UiLayoutDocument,
          `metricWidgets[${index}] (${widget.name})`,
        );
      }
    }
  }

  if (
    parsed.metricRowLayout &&
    metricStripHasContent(parsed.metricRowLayout as UiLayoutDocument)
  ) {
    assertLayoutFieldPaths(
      layoutEntityShape,
      parsed.metricRowLayout as UiLayoutDocument,
      "metricRowLayout",
    );
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

  return migrateListPresentation(parsed as EntityUIConfig);
}
