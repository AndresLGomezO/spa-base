import { createDefaultComponent } from "@repo/ui-builder-core";

import { FORMS_STEP_TYPES } from "./ui-builder-orchestrator/surfaces/forms/forms-steps.js";
import { FORMS_RENDER_STEP_TYPES } from "./ui-builder-orchestrator/surfaces/forms-render/forms-render-steps.js";
import { LIST_STEP_TYPES } from "./ui-builder-orchestrator/surfaces/list/list-steps.js";

const ENTITY_CURRENT_BLOCK_ID = "entity.current";

export interface MockContextBlock {
  readonly id: string;
  readonly content: string;
}

export function buildMockChatAnswer(question: string): string {
  const preview = question.trim().slice(0, 200);
  return `[mock] You asked: ${preview || "(empty question)"}`;
}

function extractFieldNamesFromEntityBlock(content: string): readonly string[] {
  const fields = [...content.matchAll(/`([^`]+)`/g)]
    .map((match) => match[1]?.trim())
    .filter((field): field is string => Boolean(field));
  return [...new Set(fields)];
}

function resolveFields(
  contextBlocks: readonly MockContextBlock[] | undefined,
): readonly string[] {
  const allowedBlock = contextBlocks?.find(
    (block) =>
      block.id === "step.allowedTableFieldPaths" ||
      block.id === "step.allowedFieldPaths" ||
      block.id === "step.allowedFormFieldPaths",
  );
  if (allowedBlock) {
    const allowed = [...allowedBlock.content.matchAll(/`([^`]+)`/g)]
      .map((match) => match[1]?.trim())
      .filter((field): field is string => Boolean(field));
    if (allowed.length > 0) {
      return allowed;
    }
  }

  const entityBlock = contextBlocks?.find(
    (block) => block.id === ENTITY_CURRENT_BLOCK_ID,
  );
  const extractedFields = entityBlock
    ? extractFieldNamesFromEntityBlock(entityBlock.content)
    : [];
  return extractedFields.length > 0 ? extractedFields : ["name"];
}

function buildWizardStepPlan(fields: readonly string[]): Array<{
  id: string;
  label: string;
  fieldPaths: readonly string[];
}> {
  const chunkSize = 3;
  const chunks: string[][] = [];
  for (let index = 0; index < fields.length; index += chunkSize) {
    chunks.push(fields.slice(index, index + chunkSize));
  }
  if (chunks.length === 0) {
    chunks.push(["name"]);
  }
  chunks.push([]);
  return chunks.map((fieldPaths, index) => ({
    id: `step-${index + 1}`,
    label: index === chunks.length - 1 ? "Review" : `Step ${index + 1}`,
    fieldPaths,
  }));
}

function parseWizardPlanFromContext(
  contextBlocks: readonly MockContextBlock[] | undefined,
): Array<{
  id: string;
  label: string;
  fieldPaths: readonly string[];
  readOnly?: boolean;
}> | null {
  const planBlock = contextBlocks?.find(
    (block) => block.id === "step.wizardPlan",
  );
  if (!planBlock?.content.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(planBlock.content) as {
      steps?: Array<{
        id: string;
        label: string;
        fieldPaths?: readonly string[];
        readOnly?: boolean;
      }>;
    };
    if (!parsed.steps?.length) {
      return null;
    }
    return parsed.steps.map((step) => ({
      id: step.id,
      label: step.label,
      fieldPaths: step.fieldPaths ?? [],
      ...(step.readOnly ? { readOnly: true } : {}),
    }));
  } catch {
    return null;
  }
}

function buildMockFormsRenderWizardJson(
  planSteps: Array<{
    id: string;
    label: string;
    fieldPaths: readonly string[];
    readOnly?: boolean;
  }>,
): string {
  const steps = planSteps.map((step) => ({
    id: step.id,
    title: step.label,
    subtitle: step.readOnly
      ? "Review your entries before submitting"
      : "Complete the fields below",
    ...(step.readOnly
      ? {}
      : { helperText: "All fields map to your entity model." }),
  }));

  return JSON.stringify({
    wizardTitle: "New Contract",
    wizardSubtitle: "Create a new contract in a few easy steps",
    sharedStyles: ".card { box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); }",
    steps,
    layoutSummary:
      "Premium wizard with dark sidebar and one step panel visible at a time",
  });
}

function buildMockFormsRenderHtml(fields: readonly string[]): string {
  const inputs = fields
    .map(
      (field) =>
        `<div class="field"><label for="${field}">${field}</label><input id="${field}" name="${field}" type="text"></div>`,
    )
    .join("");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Form preview</title><style>*{box-sizing:border-box}body{font-family:system-ui,sans-serif;margin:0;padding:1rem;background:#f9fafb;color:#111}.form{max-width:32rem;margin:0 auto;background:#fff;padding:1rem;border-radius:8px}.field{margin-bottom:1rem;display:flex;flex-direction:column;gap:.25rem}label{font-size:.875rem;font-weight:600}input,select,textarea{padding:.625rem;border:1px solid #d1d5db;border-radius:6px;font-size:1rem}button{background:#6366f1;color:#fff;border:0;padding:.75rem 1rem;border-radius:6px;font-size:1rem;width:100%;margin-top:.5rem}</style></head><body><form class="form">${inputs}<button type="submit">Submit</button></form></body></html>`;
}

function buildMockFormsRenderJson(
  fields: readonly string[],
  contextBlocks?: readonly MockContextBlock[],
): string {
  const wizardPlan = parseWizardPlanFromContext(contextBlocks);
  if (wizardPlan) {
    return buildMockFormsRenderWizardJson(wizardPlan);
  }
  if (fields.length >= 6) {
    return buildMockFormsRenderWizardJson(buildWizardStepPlan(fields));
  }
  return JSON.stringify({
    htmlDocument: buildMockFormsRenderHtml(fields),
    layoutSummary: "Mobile-first HTML form with entity fields",
  });
}

export function buildMockUiBuilderStepAnswer(
  stepId: string,
  contextBlocks?: readonly MockContextBlock[],
): string {
  const fields = resolveFields(contextBlocks);

  if (stepId === LIST_STEP_TYPES.SELECT_VIEW_TYPE) {
    return JSON.stringify({
      listViewType: "expandableTable",
    });
  }

  if (stepId === LIST_STEP_TYPES.TABLE_SELECT_FIELDS) {
    return JSON.stringify({
      fields: [...fields.slice(0, Math.min(fields.length, 6))],
      showActions: true,
    });
  }

  if (stepId === LIST_STEP_TYPES.EXPANDABLE_DEFINE_COLUMNS) {
    const summaryFields = fields.slice(0, Math.min(fields.length, 3));
    return JSON.stringify({
      columns: summaryFields.map((field, index) => ({
        id: `col-${index + 1}`,
        label: field,
        summaryField: field,
      })),
      showActions: true,
    });
  }

  if (stepId.startsWith(`${LIST_STEP_TYPES.LAYOUT_SKELETON}:`)) {
    const pathKey = stepId.split(":").slice(1).join(":");
    const layoutFields = resolveFields(contextBlocks);
    const primary = layoutFields[0] ?? "name";
    const secondary = layoutFields[1] ?? primary;
    const tertiary = layoutFields[2] ?? secondary;

    if (pathKey === "listItem") {
      return JSON.stringify({
        components: [
          {
            kind: "grid",
            columnCount: 2,
            columns: [
              {
                components: [
                  { kind: "text", fieldPath: primary },
                  ...(layoutFields.length > 1
                    ? [{ kind: "text", fieldPath: secondary }]
                    : []),
                ],
              },
              {
                components: [{ kind: "badge", fieldPath: tertiary }],
              },
            ],
          },
        ],
      });
    }

    return JSON.stringify({
      components: [
        { kind: "text", fieldPath: primary },
        ...(layoutFields.length > 1
          ? [{ kind: "text", fieldPath: secondary }]
          : []),
      ],
    });
  }

  if (stepId.startsWith(`${LIST_STEP_TYPES.CONFIGURE_COMPONENT}:`)) {
    const taskBlock = contextBlocks?.find((block) => block.id === "step.task");
    const kindMatch = taskBlock?.content.match(/full ([a-z-]+) component/i);
    const kind = kindMatch?.[1] ?? "text";
    const fieldPath = fields[0] ?? "name";
    return JSON.stringify({
      component: createDefaultComponent(kind as "text", fieldPath),
    });
  }

  if (
    stepId === FORMS_RENDER_STEP_TYPES.COMPOSE_HTML ||
    stepId === FORMS_RENDER_STEP_TYPES.COMPOSE_BRIEF
  ) {
    return buildMockFormsRenderJson(fields, contextBlocks);
  }

  if (
    stepId === FORMS_RENDER_STEP_TYPES.REFINE_HTML ||
    stepId === FORMS_RENDER_STEP_TYPES.REFINE_BRIEF
  ) {
    return buildMockFormsRenderJson(fields, contextBlocks);
  }

  if (stepId === FORMS_STEP_TYPES.SELECT_PRESENTATION) {
    return JSON.stringify({
      presentation: fields.length > 6 ? "wizard" : "plain",
    });
  }

  if (stepId === FORMS_STEP_TYPES.GENERATE_BLUEPRINT) {
    const plan = buildWizardStepPlan(fields);
    return JSON.stringify({
      blueprint: {
        conceptName: "Guided contract intake",
        presentation: "wizard",
        visualTheme: "left-rail stepper with accent header",
        steps: plan.map(({ id, label }, index) => ({
          id,
          label,
          goal:
            index === plan.length - 1
              ? "confirm before submit"
              : `collect ${label.toLowerCase()} details`,
          maxFields: index === plan.length - 1 ? 4 : 3,
          ...(index === 0
            ? {
                helper:
                  "info-box -> 'Use the legal contract name shown on signed documents.'",
              }
            : {}),
          ...(index === plan.length - 1 ? { readOnly: true } : {}),
        })),
        footerLayout: "left=wizard-progress right=Back/Next",
      },
    });
  }

  if (stepId === FORMS_STEP_TYPES.DEFINE_WIZARD_STEPS) {
    const plan = buildWizardStepPlan(fields);
    return JSON.stringify({
      steps: plan.map(({ id, label }) => ({ id, label })),
    });
  }

  if (stepId === FORMS_STEP_TYPES.ALLOCATE_FIELDS_TO_STEPS) {
    return JSON.stringify({
      steps: buildWizardStepPlan(fields),
    });
  }

  if (stepId.startsWith(`${FORMS_STEP_TYPES.LAYOUT_SKELETON}:`)) {
    const pathKey = stepId.split(":").slice(1).join(":");
    const formFields = resolveFields(contextBlocks);
    const primary = formFields[0] ?? "name";
    const secondary = formFields[1] ?? primary;

    if (pathKey === "wizard.shell") {
      return JSON.stringify({
        components: [
          { kind: "wizard-progress" },
          { kind: "wizard-step-host" },
          { kind: "wizard-actions" },
        ],
      });
    }

    if (pathKey === "wizard.modalFooter") {
      return JSON.stringify({
        components: [{ kind: "form-actions" }],
      });
    }

    if (pathKey === "plain.root" || pathKey.startsWith("wizard.steps[")) {
      return JSON.stringify({
        components: [
          { kind: "form-field", fieldPath: primary },
          ...(formFields.length > 1
            ? [{ kind: "form-field", fieldPath: secondary }]
            : []),
          ...(pathKey === "plain.root" ? [{ kind: "form-actions" }] : []),
        ],
      });
    }

    return JSON.stringify({
      components: [{ kind: "form-field", fieldPath: primary }],
    });
  }

  if (stepId.startsWith(`${FORMS_STEP_TYPES.CONFIGURE_COMPONENT}:`)) {
    const taskBlock = contextBlocks?.find((block) => block.id === "step.task");
    const kindMatch = taskBlock?.content.match(/Configure ([a-z-]+)/i);
    const kind = kindMatch?.[1] ?? "form-field";
    const fieldPath = fields[0] ?? "name";
    if (kind === "form-section") {
      return JSON.stringify({
        component: { kind: "form-section", title: "Details" },
      });
    }
    if (kind === "wizard-progress") {
      return JSON.stringify({
        component: {
          kind: "wizard-progress",
          variant: "stepper",
          stepLabel: { show: true, position: "bottom", bold: true },
          conditionalStyles: [
            { matchValue: "active", background: "primary", textColor: "white" },
            {
              matchValue: "completed",
              background: "success",
              textColor: "white",
            },
          ],
        },
      });
    }
    return JSON.stringify({
      component: createDefaultComponent(kind as "form-field", fieldPath),
    });
  }

  return JSON.stringify({ listViewType: "expandableTable" });
}

/** @deprecated Use buildMockUiBuilderStepAnswer */
export function buildMockUiBuilderListAnswer(
  contextBlocks: readonly MockContextBlock[] | undefined,
): string {
  return buildMockUiBuilderStepAnswer(
    LIST_STEP_TYPES.SELECT_VIEW_TYPE,
    contextBlocks,
  );
}
