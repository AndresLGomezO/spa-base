import type { UiComponentConfig } from "../types/component.js";
import { isFieldUiComponent } from "../types/component.js";
import type {
  ColumnNode,
  ComponentRowNode,
  NestedLayoutRowNode,
  RowNode,
  UiLayoutDocument,
} from "../types/layout.js";
import {
  type UiBuilderFieldSlot,
  type UiBuilderPresetKind,
  uiBuilderSlotToken,
} from "./types.js";

export interface GenericizeLayoutNodeResult {
  readonly template: unknown;
  readonly fieldSlots: readonly UiBuilderFieldSlot[];
}

export class GenericizeLayoutNodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenericizeLayoutNodeError";
  }
}

function nextSlotId(index: number): string {
  return `slot-${index + 1}`;
}

function assertNoUnsupportedComponents(component: UiComponentConfig): void {
  if (component.kind === "metric-kpi" || component.kind === "related-records") {
    throw new GenericizeLayoutNodeError(
      `Presets cannot include "${component.kind}" components in v1. Remove them before saving.`,
    );
  }
}

function genericizeComponent(
  component: UiComponentConfig,
  jsonPathPrefix: string,
  slots: UiBuilderFieldSlot[],
  slotCounter: { value: number },
): UiComponentConfig {
  assertNoUnsupportedComponents(component);

  if (component.kind === "form-field") {
    const slotId = nextSlotId(slotCounter.value++);
    slots.push({
      id: slotId,
      kind: "formFieldPath",
      jsonPath: `${jsonPathPrefix}.fieldPath`,
      sourceHint: component.fieldPath,
    });
    return { ...component, fieldPath: uiBuilderSlotToken(slotId) };
  }

  if (!isFieldUiComponent(component)) {
    return component;
  }

  const genericPrimary =
    component.primary.type === "field"
      ? (() => {
          const slotId = nextSlotId(slotCounter.value++);
          slots.push({
            id: slotId,
            kind: "dataSourceField",
            jsonPath: `${jsonPathPrefix}.primary.path`,
            sourceHint: component.primary.path,
          });
          return {
            type: "field" as const,
            path: uiBuilderSlotToken(slotId),
          };
        })()
      : component.primary;

  const genericFallbacks = component.fallbacks?.map((source, index) => {
    if (source.type !== "field") {
      return source;
    }
    const slotId = nextSlotId(slotCounter.value++);
    slots.push({
      id: slotId,
      kind: "dataSourceField",
      jsonPath: `${jsonPathPrefix}.fallbacks[${index}].path`,
      sourceHint: source.path,
    });
    return { type: "field" as const, path: uiBuilderSlotToken(slotId) };
  });

  return {
    ...component,
    primary: genericPrimary,
    ...(genericFallbacks ? { fallbacks: genericFallbacks } : {}),
  };
}

function genericizeRow(
  row: RowNode,
  jsonPathPrefix: string,
  slots: UiBuilderFieldSlot[],
  slotCounter: { value: number },
): RowNode {
  if (row.type === "component") {
    return {
      ...row,
      component: genericizeComponent(
        row.component,
        `${jsonPathPrefix}.component`,
        slots,
        slotCounter,
      ),
    };
  }

  return {
    ...row,
    columns: row.columns.map((column, columnIndex) =>
      genericizeColumn(
        column,
        `${jsonPathPrefix}.columns[${columnIndex}]`,
        slots,
        slotCounter,
      ),
    ),
  };
}

function genericizeColumn(
  column: ColumnNode,
  jsonPathPrefix: string,
  slots: UiBuilderFieldSlot[],
  slotCounter: { value: number },
): ColumnNode {
  return {
    ...column,
    rows: column.rows.map((row, rowIndex) =>
      genericizeRow(
        row,
        `${jsonPathPrefix}.rows[${rowIndex}]`,
        slots,
        slotCounter,
      ),
    ),
  };
}

export function genericizeLayoutNode(
  kind: UiBuilderPresetKind,
  node: UiLayoutDocument | ColumnNode | ComponentRowNode | NestedLayoutRowNode,
): GenericizeLayoutNodeResult {
  const slots: UiBuilderFieldSlot[] = [];
  const slotCounter = { value: 0 };

  if (kind === "layout-document") {
    const layout = node as UiLayoutDocument;
    const template: UiLayoutDocument = {
      ...layout,
      root: {
        ...layout.root,
        columns: layout.root.columns.map((column, columnIndex) =>
          genericizeColumn(
            column,
            `root.columns[${columnIndex}]`,
            slots,
            slotCounter,
          ),
        ),
      },
    };
    return { template, fieldSlots: slots };
  }

  if (kind === "column") {
    const template = genericizeColumn(
      node as ColumnNode,
      "column",
      slots,
      slotCounter,
    );
    return { template, fieldSlots: slots };
  }

  if (kind === "component-row") {
    const row = node as ComponentRowNode;
    if (row.type !== "component") {
      throw new GenericizeLayoutNodeError("Expected a component row.");
    }
    const template = genericizeRow(
      row,
      "row",
      slots,
      slotCounter,
    ) as ComponentRowNode;
    return { template, fieldSlots: slots };
  }

  const nested = node as NestedLayoutRowNode;
  const template: NestedLayoutRowNode = {
    ...nested,
    columns: nested.columns.map((column, columnIndex) =>
      genericizeColumn(column, `columns[${columnIndex}]`, slots, slotCounter),
    ),
  };
  return { template, fieldSlots: slots };
}
