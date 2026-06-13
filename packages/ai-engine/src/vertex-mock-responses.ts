import { createDefaultComponent } from "@repo/ui-builder-core";

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
      block.id === "step.allowedFieldPaths",
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

export function buildMockUiBuilderStepAnswer(
  stepId: string,
  contextBlocks?: readonly MockContextBlock[],
): string {
  const fields = resolveFields(contextBlocks);

  if (stepId === LIST_STEP_TYPES.SELECT_VIEW_TYPE) {
    return JSON.stringify({
      listViewType: fields.length > 8 ? "table" : "table",
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
            kind: "nested-layout",
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

  return JSON.stringify({ listViewType: "table" });
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
