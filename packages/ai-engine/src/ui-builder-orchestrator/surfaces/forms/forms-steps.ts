import { z } from "zod";

export {
  formBlueprintSchema,
  generateBlueprintOutputSchema,
} from "./forms-blueprint.schema.js";

export const FORMS_STEP_TYPES = {
  SELECT_PRESENTATION: "forms.selectPresentation",
  GENERATE_BLUEPRINT: "forms.generateBlueprint",
  DEFINE_WIZARD_STEPS: "forms.defineWizardSteps",
  ALLOCATE_FIELDS_TO_STEPS: "forms.allocateFieldsToSteps",
  LAYOUT_SKELETON: "forms.layoutSkeleton",
  CONFIGURE_COMPONENT: "forms.configureComponent",
} as const;

export type FormsStepType =
  (typeof FORMS_STEP_TYPES)[keyof typeof FORMS_STEP_TYPES];

const responsiveBreakpointSchema = z.enum(["base", "sm", "md", "lg", "xl"]);

const formSkeletonKindSchema = z.enum([
  "form-field",
  "entity-field-selector",
  "form-section",
  "form-actions",
  "wizard-progress",
  "wizard-step-host",
  "wizard-actions",
  "text",
  "image",
  "icon",
  "date",
  "numeric",
  "badge",
]);

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
      kind: z.union([formSkeletonKindSchema, z.literal("nested-layout")]),
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

export const selectPresentationOutputSchema = z
  .object({
    presentation: z.enum(["plain", "wizard"]),
  })
  .strict();

export const defineWizardStepsOutputSchema = z
  .object({
    steps: z
      .array(
        z
          .object({
            id: z.string().trim().min(1),
            label: z.string().trim().min(1),
          })
          .strict(),
      )
      .min(2)
      .max(8),
  })
  .strict();

export const allocateFieldsToStepsOutputSchema = z
  .object({
    steps: z
      .array(
        z
          .object({
            id: z.string().trim().min(1),
            label: z.string().trim().min(1),
            fieldPaths: z.array(z.string().trim().min(1)).max(4),
          })
          .strict(),
      )
      .min(2)
      .max(8),
  })
  .strict();

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

export const STEP_OUTPUT_INSTRUCTIONS: Record<FormsStepType, string> = {
  [FORMS_STEP_TYPES.SELECT_PRESENTATION]: `Return ONLY compact JSON: { "presentation": "plain" | "wizard" }. Use "wizard" when the user wants multi-step flows or when there are many fields to group. Use "plain" for simple create/edit forms.`,
  [FORMS_STEP_TYPES.GENERATE_BLUEPRINT]: `Return ONLY compact JSON: { "blueprint": { "conceptName", "presentation", "visualTheme?", "steps": [{ "id", "label", "goal?", "maxFields?", "helper?", "readOnly?" }], "footerLayout?" } }. Be imaginative — grouped steps, helper callouts, review step. No layout JSON or styles.`,
  [FORMS_STEP_TYPES.DEFINE_WIZARD_STEPS]: `Return ONLY compact JSON: { "steps": [{ "id": string, "label": string }] }. Create 2-8 steps with clear labels. Include a final review step (empty label suffix like "Review" is OK). Group related fields logically — field assignment happens in the next step.`,
  [FORMS_STEP_TYPES.ALLOCATE_FIELDS_TO_STEPS]: `Return ONLY compact JSON: { "steps": [{ "id", "label", "fieldPaths": string[] }] }. Reuse the exact "id" values from the defined wizard steps block — same step count and ids, only add fieldPaths arrays. Assign each allowed form field to exactly one step. Target 3 ± 1 fields per step (max 4). Last step may be review-only with fieldPaths: [].`,
  [FORMS_STEP_TYPES.LAYOUT_SKELETON]: `Return ONLY compact JSON skeleton: { "components": [...] }. Each item is either a form/wizard component kind with optional "fieldPath" for form-field/entity-field-selector/display kinds, structural kinds (form-section, form-actions, wizard-progress, wizard-step-host, wizard-actions) with kind only and NO fieldPath, optional nested-layout columns inside components, or static hint text via { "kind": "text" } without fieldPath. Content is assembled inside a root container automatically. Do NOT return full layout documents unless asked.`,
  [FORMS_STEP_TYPES.CONFIGURE_COMPONENT]: `Return ONLY compact JSON: { "component": { "kind", ... } }. You may return the component object directly if it includes "kind". For wizard-progress choose variant "steps" (step list), "bar" (progress bar), or "stepper" (numbered circles) with matching stepLabel and/or barTrackColor/barFillColor and conditionalStyles. For form-field use fieldPath only (no label object). For text hints use primary.type "static". Styles and conditionalStyles are allowed when they improve UX.`,
};

const FORMS_STRUCTURAL_CONFIGURE_KINDS = new Set([
  "form-actions",
  "wizard-progress",
  "wizard-step-host",
  "wizard-actions",
]);

export function buildFormsConfigureOutputInstruction(
  kind: string,
  fieldPath?: string,
  options?: {
    readonly wizardProgressVariant?: "steps" | "bar" | "stepper";
  },
): string {
  const base = STEP_OUTPUT_INSTRUCTIONS[FORMS_STEP_TYPES.CONFIGURE_COMPONENT];

  if (kind === "form-field" && fieldPath) {
    return `${base} For this step return: { "component": { "kind": "form-field", "fieldPath": "${fieldPath}" } }. Optional hideLabel or styles only — do not include label config on form-field.`;
  }

  if (kind === "entity-field-selector" && fieldPath) {
    return `${base} Return: { "component": { "kind": "entity-field-selector", "fieldPath": "${fieldPath}" } }.`;
  }

  if (kind === "form-section") {
    return `${base} Return: { "component": { "kind": "form-section", "title": "Section title" } } with optional styles.`;
  }

  if (kind === "wizard-progress") {
    const variant = options?.wizardProgressVariant;
    const variantClause = variant
      ? `Use variant "${variant}".`
      : 'Choose variant "steps", "bar", or "stepper".';
    return `${base} Return wizard-progress. ${variantClause} For "steps" use stepLabel; for "bar" use barTrackColor/barFillColor; for "stepper" use stepLabel plus conditionalStyles for active/completed steps.`;
  }

  if (kind === "text") {
    return `${base} For static hint callouts return: { "component": { "kind": "text", "primary": { "type": "static", "value": "..." }, "styles": [...] } }.`;
  }

  if (FORMS_STRUCTURAL_CONFIGURE_KINDS.has(kind)) {
    return `${base} Return: { "component": { "kind": "${kind}" } } — add styles only when they improve layout.`;
  }

  return base;
}

export function stepTypeFromStep(step: {
  readonly type: string;
}): FormsStepType {
  return step.type as FormsStepType;
}
