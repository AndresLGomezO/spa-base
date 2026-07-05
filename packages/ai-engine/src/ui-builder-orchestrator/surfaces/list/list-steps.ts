import { z } from "zod";

export const LIST_STEP_TYPES = {
  SELECT_VIEW_TYPE: "list.selectViewType",
  TABLE_SELECT_FIELDS: "list.tableSelectFields",
  EXPANDABLE_DEFINE_COLUMNS: "list.expandableDefineColumns",
  LAYOUT_SKELETON: "list.layoutSkeleton",
  CONFIGURE_COMPONENT: "list.configureComponent",
} as const;

export type ListStepType =
  (typeof LIST_STEP_TYPES)[keyof typeof LIST_STEP_TYPES];

const responsiveBreakpointSchema = z.enum(["base", "sm", "md", "lg", "xl"]);

const displayComponentKindSchema = z.enum([
  "text",
  "image",
  "icon",
  "date",
  "numeric",
  "badge",
  "metric-kpi",
]);

export const selectViewTypeOutputSchema = z
  .object({
    listViewType: z.enum(["table", "card", "expandableTable"]),
  })
  .strict();

export const tableSelectFieldsOutputSchema = z
  .object({
    fields: z.array(z.string().trim().min(1)).min(1),
    showActions: z.boolean().optional(),
  })
  .strict();

export const expandableDefineColumnsOutputSchema = z
  .object({
    columns: z
      .array(
        z
          .object({
            id: z.string().trim().min(1),
            label: z.string().trim().min(1).optional(),
            displayFrom: responsiveBreakpointSchema.optional(),
            displayTo: responsiveBreakpointSchema.optional(),
            summaryField: z.string().trim().min(1).optional(),
          })
          .strict(),
      )
      .min(1),
    showActions: z.boolean().optional(),
  })
  .strict();

const skeletonComponentSchema: z.ZodType<{
  kind: string;
  fieldPath?: string;
  displayFrom?: z.infer<typeof responsiveBreakpointSchema>;
  displayTo?: z.infer<typeof responsiveBreakpointSchema>;
  columnCount?: number;
  columns?: { components: unknown[] }[];
}> = z.lazy(() =>
  z
    .object({
      kind: z.union([
        displayComponentKindSchema,
        z.literal("grid"),
        z.literal("nested-layout"),
      ]),
      fieldPath: z.string().trim().min(1).optional(),
      displayFrom: responsiveBreakpointSchema.optional(),
      displayTo: responsiveBreakpointSchema.optional(),
      columnCount: z.number().int().min(1).max(6).optional(),
      columns: z
        .array(
          z
            .object({
              components: z.array(skeletonComponentSchema).min(1),
            })
            .strict(),
        )
        .optional(),
    })
    .strict(),
);

export const layoutSkeletonOutputSchema = z
  .object({
    components: z.array(skeletonComponentSchema).min(1),
  })
  .strict();

export const configureComponentOutputSchema = z
  .object({
    component: z.record(z.string(), z.unknown()),
  })
  .strict();

export const STEP_OUTPUT_INSTRUCTIONS: Record<ListStepType, string> = {
  [LIST_STEP_TYPES.SELECT_VIEW_TYPE]: `Return ONLY compact JSON: { "listViewType": "table" | "card" | "expandableTable" }. Prefer "card" when the entity has image/logo fields or the user wants visual, mobile-first, premium UX. Use "table" only when many fields (>8) need dense side-by-side scanning.`,
  [LIST_STEP_TYPES.TABLE_SELECT_FIELDS]: `Return ONLY compact JSON: { "fields": string[], "showActions"?: boolean }. Use ONLY allowed table column field paths (direct entity field names such as providerId, never relation display paths like provider.name). Order columns for visual story: identifier/name first, status badges early, amounts/dates after.`,
  [LIST_STEP_TYPES.EXPANDABLE_DEFINE_COLUMNS]: `Return ONLY compact JSON: { "columns": [{ "id", "label"?, "displayFrom"?, "displayTo"?, "summaryField"? }], "showActions"?: boolean }. Prefer 3-5 summary columns with descriptive labels and a visual primary column.`,
  [LIST_STEP_TYPES.LAYOUT_SKELETON]: `Return ONLY compact JSON skeleton: { "components": [...] }. Each item is either { "kind": "text"|"image"|"icon"|"date"|"numeric"|"badge"|"metric-kpi", "fieldPath": string, "displayFrom"?, "displayTo"? } or { "kind": "grid", "trackCount": number, "tracks": [{ "components": [...] }] }. Do NOT return root/listItem/full layout documents or component props like primary/label/id/styles. Content is assembled inside a root container automatically. For listItem card layouts: use one grid with 2–3 tracks inside components; **lead track with image (if field exists) or icon**; mix badge/date/numeric — avoid a skeleton of text-only rows.`,
  [LIST_STEP_TYPES.CONFIGURE_COMPONENT]: `Return ONLY compact JSON: { "component": { "kind", "primary", ... } }. You may return the component object directly if it includes "kind". Do NOT wrap in layout rows, listItem, or root. **Include styling:** use styles (fontWeight, fontSize, color, padding, borderRadius), conditionalStyles on badge/status fields, label config, imageSize on images, displayFormat on numeric — theme tokens first, custom hex sparingly for accent emphasis.`,
};

export function stepTypeFromStep(step: {
  readonly type: string;
}): ListStepType {
  return step.type as ListStepType;
}
