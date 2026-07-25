/**
 * @ai-context-sync
 * When changing design layout slice envelopes, run: pnpm generate:ai-context
 * Affected fragments: ui.surface.*
 */
import {
  createDefaultUiLayout,
  uiLayoutDocumentSchema,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { z } from "zod";

import type { DefinedEntity, FieldDefinitions } from "../types.js";
import { getDefaultEntityUI } from "./default-ui-config.js";
import type { PutEntityUiOverrideInput } from "./entity-ui-override-schema.js";
import {
  putEntityUiOverrideInputSchema,
  uiOverrideFormsSchema,
} from "./entity-ui-override-schema.js";
import type { EntityUiOverrideForms } from "./form-config.js";
import { normalizeEntityViews } from "./normalize-entity-views.js";
import { metricWidgetsSchema } from "./metric-widget-types.js";
import type { MetricWidgetDefinition } from "./metric-widget-types.js";
import type {
  EntityUIConfig,
  ExpandableTableViewConfig,
  GroupedTableColumn,
  TableViewConfig,
  ViewConfig,
} from "./types.js";
import { validateEntityUIConfig } from "./validate-ui-config.js";

export type DesignLayoutSurface =
  | "list"
  | "forms"
  | "mainPage"
  | "recordDetail"
  | "metricsRowDesigner";

export interface DesignLayoutSliceError {
  readonly path: string;
  readonly message: string;
}

const groupedTableColumnSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1).optional(),
    displayFrom: z.enum(["base", "sm", "md", "lg", "xl"]).optional(),
    displayTo: z.enum(["base", "sm", "md", "lg", "xl"]).optional(),
    cellLayout: uiLayoutDocumentSchema,
  })
  .strict();

const listSliceDataSchema = z
  .object({
    listViewType: z.enum(["card", "expandableTable", "compact"]),
    table: z
      .object({
        fields: z.array(z.string().trim().min(1)).min(1),
        showActions: z.boolean().optional(),
      })
      .strict(),
    expandableTable: z
      .object({
        columns: z.array(groupedTableColumnSchema).min(1),
        rowExpandLayout: uiLayoutDocumentSchema,
        showActions: z.boolean().optional(),
        summaryField: z.string().optional(),
      })
      .strict(),
    listItem: uiLayoutDocumentSchema.optional(),
  })
  .strict();

const mainPageSliceDataSchema = z
  .object({
    mainPage: uiLayoutDocumentSchema,
  })
  .strict();

const recordDetailSliceDataSchema = z
  .object({
    recordDetail: uiLayoutDocumentSchema,
  })
  .strict();

const metricsRowDesignerSliceDataSchema = z
  .object({
    metricWidgets: metricWidgetsSchema,
    metricRowLayout: uiLayoutDocumentSchema,
  })
  .strict();

export interface ListSliceData {
  readonly listViewType: "card" | "expandableTable" | "compact";
  readonly table: {
    readonly fields: readonly string[];
    readonly showActions?: boolean;
  };
  readonly expandableTable: {
    readonly columns: readonly GroupedTableColumn[];
    readonly rowExpandLayout: UiLayoutDocument;
    readonly showActions?: boolean;
    readonly summaryField?: string;
  };
  readonly listItem?: UiLayoutDocument;
}

export type FormsSliceData = EntityUiOverrideForms;

export interface MainPageSliceData {
  readonly mainPage: UiLayoutDocument;
}

export interface RecordDetailSliceData {
  readonly recordDetail: UiLayoutDocument;
}

export interface MetricsRowDesignerSliceData {
  readonly metricWidgets: readonly MetricWidgetDefinition[];
  readonly metricRowLayout: UiLayoutDocument;
}

export type DesignLayoutSliceData =
  | ListSliceData
  | FormsSliceData
  | MainPageSliceData
  | RecordDetailSliceData
  | MetricsRowDesignerSliceData;

const designLayoutSliceEnvelopeSchema = z
  .object({
    kind: z.literal("design-layout-slice"),
    surface: z.enum([
      "list",
      "forms",
      "mainPage",
      "recordDetail",
      "metricsRowDesigner",
    ]),
    version: z.literal(1),
    formDesignId: z.string().trim().min(1).optional(),
    data: z.unknown(),
  })
  .strict();

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

function zodErrorsToSliceErrors(error: z.ZodError): DesignLayoutSliceError[] {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}

function dataSchemaForSurface(surface: DesignLayoutSurface): z.ZodType {
  switch (surface) {
    case "list":
      return listSliceDataSchema;
    case "forms":
      return uiOverrideFormsSchema;
    case "mainPage":
      return mainPageSliceDataSchema;
    case "recordDetail":
      return recordDetailSliceDataSchema;
    case "metricsRowDesigner":
      return metricsRowDesignerSliceDataSchema;
  }
}

export function createDesignLayoutSliceEnvelope(
  surface: DesignLayoutSurface,
  data: DesignLayoutSliceData,
  options?: { readonly formDesignId?: string },
): {
  readonly kind: "design-layout-slice";
  readonly surface: DesignLayoutSurface;
  readonly version: 1;
  readonly formDesignId?: string;
  readonly data: DesignLayoutSliceData;
} {
  return {
    kind: "design-layout-slice",
    surface,
    version: 1,
    ...(options?.formDesignId ? { formDesignId: options.formDesignId } : {}),
    data,
  };
}

export function createDesignLayoutSliceSkeleton(
  surface: DesignLayoutSurface,
): string {
  const emptyLayout = createDefaultUiLayout(["name"]);
  const skeletons: Record<DesignLayoutSurface, DesignLayoutSliceData> = {
    list: {
      listViewType: "expandableTable",
      table: { fields: ["name"], showActions: true },
      expandableTable: {
        columns: [
          {
            id: "col-1",
            label: "Column",
            cellLayout: emptyLayout,
          },
        ],
        rowExpandLayout: emptyLayout,
        showActions: true,
      },
    },
    forms: {
      presentation: "plain",
      modalSize: "md",
      layout: emptyLayout,
    },
    mainPage: {
      mainPage: emptyLayout,
    },
    recordDetail: {
      recordDetail: emptyLayout,
    },
    metricsRowDesigner: {
      metricWidgets: [],
      metricRowLayout: emptyLayout,
    },
  };

  return JSON.stringify(
    createDesignLayoutSliceEnvelope(surface, skeletons[surface]),
    null,
    2,
  );
}

export type DesignLayoutSliceParseResult =
  | {
      readonly ok: true;
      readonly data: DesignLayoutSliceData;
      readonly formDesignId?: string;
    }
  | { readonly ok: false; readonly errors: readonly DesignLayoutSliceError[] };

export function parseDesignLayoutSliceJson(
  text: string,
  expectedSurface: DesignLayoutSurface,
): DesignLayoutSliceParseResult {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    return {
      ok: false,
      errors: [{ path: "(root)", message: "Invalid JSON." }],
    };
  }

  const envelopeResult = designLayoutSliceEnvelopeSchema.safeParse(parsedJson);
  if (!envelopeResult.success) {
    return {
      ok: false,
      errors: zodErrorsToSliceErrors(envelopeResult.error),
    };
  }

  const envelope = envelopeResult.data;
  if (envelope.surface !== expectedSurface) {
    return {
      ok: false,
      errors: [
        {
          path: "surface",
          message: `Expected surface "${expectedSurface}" but got "${envelope.surface}".`,
        },
      ],
    };
  }

  const dataResult = dataSchemaForSurface(expectedSurface).safeParse(
    envelope.data,
  );
  if (!dataResult.success) {
    return {
      ok: false,
      errors: zodErrorsToSliceErrors(dataResult.error),
    };
  }

  return {
    ok: true,
    data: dataResult.data as DesignLayoutSliceData,
    ...(envelope.formDesignId ? { formDesignId: envelope.formDesignId } : {}),
  };
}

function listSliceToUiConfig(
  data: ListSliceData,
  baseUi: EntityUIConfig,
): EntityUIConfig {
  const tableView = baseUi.views.find((view) => view.type === "table");
  const expandableView = baseUi.views.find(
    (view) => view.type === "expandableTable",
  ) as ExpandableTableViewConfig | undefined;
  const cardView = baseUi.views.find((view) => view.type === "card");

  const listViewType =
    data.listViewType === "compact" ? "expandableTable" : data.listViewType;

  const tableViewConfig: TableViewConfig = {
    ...(tableView?.type === "table"
      ? tableView
      : { type: "table", name: "default", fields: data.table.fields }),
    type: "table",
    name: tableView?.name ?? "default",
    fields: data.table.fields,
    showActions: data.table.showActions,
    ...(tableView?.type === "table" && tableView.filters
      ? { filters: tableView.filters }
      : {}),
    ...(tableView?.type === "table" && tableView.defaultSort
      ? { defaultSort: tableView.defaultSort }
      : {}),
  };

  const expandableViewSource = expandableView ?? {
    type: "expandableTable" as const,
    name: "expandable",
    fields: data.table.fields,
    columns: data.expandableTable.columns,
    rowExpandLayout: data.expandableTable.rowExpandLayout,
  };
  const {
    summaryField: _ignoredSummaryField,
    ...expandableViewWithoutSummary
  } = expandableViewSource;
  void _ignoredSummaryField;

  const expandableViewConfig: ExpandableTableViewConfig = {
    ...expandableViewWithoutSummary,
    type: "expandableTable",
    name: expandableView?.name ?? "expandable",
    fields:
      expandableView?.fields && expandableView.fields.length > 0
        ? expandableView.fields
        : data.table.fields,
    columns: data.expandableTable.columns,
    rowExpandLayout: data.expandableTable.rowExpandLayout,
    showActions: data.expandableTable.showActions,
    ...(data.expandableTable.summaryField !== undefined
      ? { summaryField: data.expandableTable.summaryField }
      : {}),
    ...(expandableView?.filters ? { filters: expandableView.filters } : {}),
    ...(expandableView?.defaultSort
      ? { defaultSort: expandableView.defaultSort }
      : {}),
  };

  const views: ViewConfig[] = [tableViewConfig, expandableViewConfig];
  if (listViewType === "card") {
    views.push({
      type: "card",
      name: cardView?.name ?? "card",
      fields:
        cardView?.fields && cardView.fields.length > 0
          ? cardView.fields
          : data.table.fields,
      ...(data.listItem ? { layout: data.listItem } : {}),
    });
  }

  return {
    ...baseUi,
    views,
    listViewType,
    ...(data.listItem ? { listItem: data.listItem } : {}),
  };
}

function formsSliceToUiConfig(
  data: FormsSliceData,
  baseUi: EntityUIConfig,
  formDesignId?: string,
): EntityUIConfig {
  const presentation =
    data.presentation ?? baseUi.forms.presentation ?? "plain";
  const plainLayout =
    presentation === "plain" ? data.layout : baseUi.forms.create.layout;

  const mergedForms = {
    ...baseUi.forms,
    presentation,
    ...(data.modalSize ? { modalSize: data.modalSize } : {}),
    ...(data.modalSizeByBreakpoint
      ? { modalSizeByBreakpoint: data.modalSizeByBreakpoint }
      : {}),
    ...(data.modalChrome ? { modalChrome: data.modalChrome } : {}),
    ...(data.modalFooterLayout
      ? { modalFooterLayout: data.modalFooterLayout }
      : {}),
    ...(data.wizard
      ? {
          wizard: data.wizard as unknown as EntityUIConfig["forms"]["wizard"],
        }
      : {}),
    create: {
      ...baseUi.forms.create,
      ...(plainLayout ? { layout: plainLayout } : {}),
    },
    edit: {
      ...baseUi.forms.edit,
      ...(plainLayout ? { layout: plainLayout } : {}),
    },
  };

  if (!formDesignId) {
    return {
      ...baseUi,
      forms: mergedForms,
    };
  }

  const existingDesigns = baseUi.formDesigns ?? [];
  const existingIndex = existingDesigns.findIndex(
    (design) => design.id === formDesignId,
  );
  const existingDesign =
    existingIndex >= 0 ? existingDesigns[existingIndex] : undefined;

  const updatedDesign = {
    id: formDesignId,
    label: existingDesign?.label ?? formDesignId,
    presentation,
    ...(presentation !== "wizard" && plainLayout
      ? { layout: plainLayout }
      : {}),
    ...(data.modalSize ? { modalSize: data.modalSize } : {}),
    ...(data.modalSizeByBreakpoint
      ? { modalSizeByBreakpoint: data.modalSizeByBreakpoint }
      : {}),
    ...(data.modalChrome ? { modalChrome: data.modalChrome } : {}),
    ...(data.modalFooterLayout
      ? { modalFooterLayout: data.modalFooterLayout }
      : {}),
    ...(data.wizard
      ? {
          wizard: data.wizard as unknown as EntityUIConfig["forms"]["wizard"],
        }
      : {}),
  };

  const nextDesigns =
    existingIndex >= 0
      ? existingDesigns.map((design, index) =>
          index === existingIndex ? updatedDesign : design,
        )
      : [...existingDesigns, updatedDesign];

  return {
    ...baseUi,
    formDesigns: nextDesigns,
  };
}

function sliceDataToUiConfig(
  surface: DesignLayoutSurface,
  data: DesignLayoutSliceData,
  baseUi: EntityUIConfig,
  formDesignId?: string,
): EntityUIConfig {
  switch (surface) {
    case "list":
      return listSliceToUiConfig(data as ListSliceData, baseUi);
    case "forms":
      return formsSliceToUiConfig(data as FormsSliceData, baseUi, formDesignId);
    case "mainPage":
      return {
        ...baseUi,
        mainPageLayout: (data as MainPageSliceData).mainPage,
      };
    case "recordDetail":
      return {
        ...baseUi,
        recordDetailLayout: (data as RecordDetailSliceData).recordDetail,
      };
    case "metricsRowDesigner": {
      const slice = data as MetricsRowDesignerSliceData;
      return {
        ...baseUi,
        metricWidgets: slice.metricWidgets,
        metricRowLayout: slice.metricRowLayout,
      };
    }
  }
}

export type DesignLayoutSliceValidationResult =
  | { readonly ok: true; readonly data: DesignLayoutSliceData }
  | { readonly ok: false; readonly errors: readonly DesignLayoutSliceError[] };

export function validateDesignLayoutSlice(
  entity: AnyDefinedEntity,
  surface: DesignLayoutSurface,
  data: DesignLayoutSliceData,
  baseUi?: EntityUIConfig,
  options?: { readonly formDesignId?: string },
): DesignLayoutSliceValidationResult {
  const dataResult = dataSchemaForSurface(surface).safeParse(data);
  if (!dataResult.success) {
    return {
      ok: false,
      errors: zodErrorsToSliceErrors(dataResult.error),
    };
  }

  const resolvedBase = baseUi ?? getDefaultEntityUI(entity);
  const parsedData = dataResult.data as DesignLayoutSliceData;
  const mergedUi = sliceDataToUiConfig(
    surface,
    parsedData,
    resolvedBase,
    options?.formDesignId,
  );

  try {
    validateEntityUIConfig(entity, mergedUi);
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          path: "(semantic)",
          message:
            error instanceof Error ? error.message : "Validation failed.",
        },
      ],
    };
  }

  return { ok: true, data: parsedData };
}

function normalizePutListViewType(
  listViewType: PutEntityUiOverrideInput["listViewType"],
): EntityUIConfig["listViewType"] | undefined {
  if (!listViewType) {
    return undefined;
  }
  return listViewType === "compact" ? "expandableTable" : listViewType;
}

export function entityUiConfigToPutOverrideInput(
  ui: EntityUIConfig,
): PutEntityUiOverrideInput {
  const recordDetail = ui.recordDetailLayout ?? ui.detailLayout;
  const presentation = ui.forms.presentation ?? "plain";
  const plainLayout = ui.forms.create.layout ?? ui.forms.edit.layout;

  const formsPayload = {
    ...(ui.forms.presentation ? { presentation: ui.forms.presentation } : {}),
    ...(ui.forms.modalSize ? { modalSize: ui.forms.modalSize } : {}),
    ...(ui.forms.modalSizeByBreakpoint
      ? { modalSizeByBreakpoint: ui.forms.modalSizeByBreakpoint }
      : {}),
    ...(ui.forms.modalChrome ? { modalChrome: ui.forms.modalChrome } : {}),
    ...(ui.forms.modalFooterLayout
      ? { modalFooterLayout: ui.forms.modalFooterLayout }
      : {}),
    ...(presentation === "wizard" && ui.forms.wizard
      ? { wizard: ui.forms.wizard }
      : {}),
    ...(presentation !== "wizard" && plainLayout
      ? { layout: plainLayout }
      : {}),
  } as NonNullable<PutEntityUiOverrideInput["forms"]>;

  const hasFormsPayload = Object.keys(formsPayload).length > 0;

  return {
    views: normalizeEntityViews([
      ...ui.views,
    ]) as PutEntityUiOverrideInput["views"],
    ...(ui.listViewType ? { listViewType: ui.listViewType } : {}),
    ...(ui.listItem ? { listItem: ui.listItem } : {}),
    ...(ui.mainPageLayout ? { mainPage: ui.mainPageLayout } : {}),
    ...(recordDetail ? { recordDetail } : {}),
    ...(ui.metricWidgets ? { metricWidgets: ui.metricWidgets } : {}),
    ...(ui.metricRowLayout ? { metricRowLayout: ui.metricRowLayout } : {}),
    ...(hasFormsPayload ? { forms: formsPayload } : {}),
    ...(ui.formDesigns ? { formDesigns: ui.formDesigns } : {}),
    ...(ui.entityPageCreateFormDesignId
      ? { entityPageCreateFormDesignId: ui.entityPageCreateFormDesignId }
      : {}),
    ...(ui.entityPageEditFormDesignId
      ? { entityPageEditFormDesignId: ui.entityPageEditFormDesignId }
      : {}),
  };
}

export type PutEntityUiOverrideParseResult =
  | { readonly ok: true; readonly data: PutEntityUiOverrideInput }
  | { readonly ok: false; readonly errors: readonly DesignLayoutSliceError[] };

export function parsePutEntityUiOverrideJson(
  text: string,
): PutEntityUiOverrideParseResult {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    return {
      ok: false,
      errors: [{ path: "(root)", message: "Invalid JSON." }],
    };
  }

  const result = putEntityUiOverrideInputSchema.safeParse(parsedJson);
  if (!result.success) {
    return {
      ok: false,
      errors: zodErrorsToSliceErrors(result.error),
    };
  }

  return { ok: true, data: result.data as PutEntityUiOverrideInput };
}

export function validatePutEntityUiOverrideInput(
  entity: AnyDefinedEntity,
  input: PutEntityUiOverrideInput,
  baseUi?: EntityUIConfig,
): PutEntityUiOverrideParseResult {
  const resolvedBase = baseUi ?? getDefaultEntityUI(entity);

  const mergedUi: EntityUIConfig = {
    ...resolvedBase,
    views: input.views as EntityUIConfig["views"],
    ...(input.listViewType
      ? { listViewType: normalizePutListViewType(input.listViewType) }
      : {}),
    ...(input.listItem ? { listItem: input.listItem } : {}),
    ...(input.mainPage ? { mainPageLayout: input.mainPage } : {}),
    ...(input.recordDetail ? { recordDetailLayout: input.recordDetail } : {}),
    ...(input.metricWidgets ? { metricWidgets: input.metricWidgets } : {}),
    ...(input.metricRowLayout
      ? { metricRowLayout: input.metricRowLayout }
      : {}),
    ...(input.forms
      ? {
          forms: {
            ...resolvedBase.forms,
            ...(input.forms.presentation
              ? { presentation: input.forms.presentation }
              : {}),
            ...(input.forms.modalSize
              ? { modalSize: input.forms.modalSize }
              : {}),
            ...(input.forms.modalSizeByBreakpoint
              ? { modalSizeByBreakpoint: input.forms.modalSizeByBreakpoint }
              : {}),
            ...(input.forms.modalChrome
              ? { modalChrome: input.forms.modalChrome }
              : {}),
            ...(input.forms.modalFooterLayout
              ? { modalFooterLayout: input.forms.modalFooterLayout }
              : {}),
            ...(input.forms.wizard
              ? {
                  wizard: input.forms
                    .wizard as unknown as EntityUIConfig["forms"]["wizard"],
                }
              : {}),
            ...(input.forms.layout
              ? {
                  create: {
                    ...resolvedBase.forms.create,
                    layout: input.forms.layout,
                  },
                  edit: {
                    ...resolvedBase.forms.edit,
                    layout: input.forms.layout,
                  },
                }
              : {}),
          },
        }
      : {}),
  };

  try {
    validateEntityUIConfig(entity, mergedUi);
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          path: "(semantic)",
          message:
            error instanceof Error ? error.message : "Validation failed.",
        },
      ],
    };
  }

  return { ok: true, data: input };
}
