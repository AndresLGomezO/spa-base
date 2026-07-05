import {
  componentRowSchema,
  uiLayoutDocumentSchema,
  columnNodeSchema,
} from "../schema/ui-layout-schema.js";
import type {
  ColumnNode,
  ComponentRowNode,
  UiLayoutDocument,
} from "../types/layout.js";
import {
  validateLayoutJsonImport,
  type LayoutJsonImportScope,
  type ValidateLayoutJsonImportOptions,
} from "../validation/layout-json-import.js";
import {
  regenerateColumnSubtree,
  regenerateComponentRowSubtree,
  regenerateLayoutDocumentIds,
} from "../validation/regenerate-layout-ids.js";
import {
  type UiBuilderFieldSlot,
  type UiBuilderPresetKind,
  isUiBuilderSlotToken,
  parseUiBuilderSlotToken,
} from "./types.js";

export interface ApplyPresetSlotsResult {
  readonly ok: boolean;
  readonly data?: UiLayoutDocument | ColumnNode | ComponentRowNode;
  readonly errors: readonly { path: string; message: string }[];
}

function presetKindToImportScope(
  kind: UiBuilderPresetKind,
): LayoutJsonImportScope {
  switch (kind) {
    case "layout-document":
      return { type: "layout-document" };
    case "component-row":
      return { type: "component-row" };
    case "column":
    case "grid-track":
      return { type: "layout-document" };
  }
}

function wrapColumnAsLayout(column: ColumnNode): UiLayoutDocument {
  return {
    root: {
      type: "root",
      id: "preset-wrap-root",
      columnCount: 1,
      columns: [column],
    },
  };
}

function substituteSlotTokens(
  value: unknown,
  slotValues: Readonly<Record<string, string>>,
): unknown {
  if (typeof value === "string") {
    const slotId = parseUiBuilderSlotToken(value);
    if (slotId) {
      const mapped = slotValues[slotId];
      if (mapped === undefined) {
        return value;
      }
      return mapped;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => substituteSlotTokens(item, slotValues));
  }

  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(record)) {
      next[key] = substituteSlotTokens(nested, slotValues);
    }
    return next;
  }

  return value;
}

function validateSlotMappings(
  fieldSlots: readonly UiBuilderFieldSlot[],
  slotValues: Readonly<Record<string, string>>,
): readonly { path: string; message: string }[] {
  const errors: { path: string; message: string }[] = [];

  for (const slot of fieldSlots) {
    const mapped = slotValues[slot.id]?.trim();
    if (!mapped) {
      errors.push({
        path: slot.id,
        message: `Field mapping is required for slot "${slot.id}".`,
      });
      continue;
    }
    if (isUiBuilderSlotToken(mapped)) {
      errors.push({
        path: slot.id,
        message: `Field mapping for slot "${slot.id}" must be a real field path.`,
      });
    }
  }

  return errors;
}

function parseByKind(kind: UiBuilderPresetKind, parsed: unknown): unknown {
  switch (kind) {
    case "layout-document":
      return uiLayoutDocumentSchema.parse(parsed);
    case "column":
    case "grid-track":
      return columnNodeSchema.parse(parsed);
    case "component-row":
      return componentRowSchema.parse(parsed);
  }
}

function regenerateByKind(
  kind: UiBuilderPresetKind,
  parsed: unknown,
): UiLayoutDocument | ColumnNode | ComponentRowNode {
  switch (kind) {
    case "layout-document":
      return regenerateLayoutDocumentIds(parsed as UiLayoutDocument);
    case "column":
    case "grid-track":
      return regenerateColumnSubtree(parsed as ColumnNode);
    case "component-row":
      return regenerateComponentRowSubtree(parsed as ComponentRowNode);
  }
}

export function applyPresetSlots(
  kind: UiBuilderPresetKind,
  templateJson: string,
  fieldSlots: readonly UiBuilderFieldSlot[],
  slotValues: Readonly<Record<string, string>>,
  options: ValidateLayoutJsonImportOptions,
): ApplyPresetSlotsResult {
  const mappingErrors = validateSlotMappings(fieldSlots, slotValues);
  if (mappingErrors.length > 0) {
    return { ok: false, errors: mappingErrors };
  }

  let template: unknown;
  try {
    template = JSON.parse(templateJson);
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          path: "(parse)",
          message:
            error instanceof Error ? error.message : "Invalid template JSON",
        },
      ],
    };
  }

  const substituted = substituteSlotTokens(template, slotValues);

  let parsed: unknown;
  try {
    parsed = parseByKind(kind, substituted);
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          path: "(schema)",
          message:
            error instanceof Error ? error.message : "Invalid preset template",
        },
      ],
    };
  }

  const validationTarget =
    kind === "column"
      ? wrapColumnAsLayout(parsed as ColumnNode)
      : (parsed as UiLayoutDocument | ComponentRowNode);

  const validationJson =
    kind === "column"
      ? JSON.stringify(validationTarget)
      : JSON.stringify(parsed);

  const validation = validateLayoutJsonImport(
    validationJson,
    presetKindToImportScope(kind),
    options,
  );

  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  return {
    ok: true,
    data: regenerateByKind(kind, parsed),
    errors: [],
  };
}
