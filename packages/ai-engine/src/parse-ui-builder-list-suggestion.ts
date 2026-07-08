import type { DefinedEntity, FieldDefinitions } from "@repo/entities";
import {
  validateDesignLayoutSlice,
  type DesignLayoutSliceError,
  type ListSliceData,
} from "@repo/entities";

import { normalizeAiListSliceSuggestion } from "./normalize-ai-list-slice-suggestion.js";

export interface ParseUiBuilderListSuggestionResult {
  readonly status: "ready" | "failed";
  readonly sliceData?: ListSliceData;
  readonly listViewType?: "card" | "expandableTable";
  readonly validationErrors?: readonly DesignLayoutSliceError[];
  readonly rawAnswer?: string;
}

export interface ParseUiBuilderListSuggestionOptions {
  readonly fallbackLayoutJson?: string;
}

export function parseUiBuilderListSuggestion(
  entity: DefinedEntity<string, FieldDefinitions>,
  rawAnswer: string,
  extractJson: (answer: string) => unknown,
  options?: ParseUiBuilderListSuggestionOptions,
): ParseUiBuilderListSuggestionResult {
  try {
    const json = extractJson(rawAnswer);
    const normalized = normalizeAiListSliceSuggestion(
      entity,
      json,
      options?.fallbackLayoutJson,
    );
    if (!normalized) {
      return {
        status: "failed",
        validationErrors: [
          {
            path: "listViewType",
            message:
              "AI output must include a valid listViewType (card or expandableTable).",
          },
        ],
        rawAnswer,
      };
    }

    const validated = validateDesignLayoutSlice(entity, "list", normalized);
    if (!validated.ok) {
      return {
        status: "failed",
        validationErrors: validated.errors,
        rawAnswer,
      };
    }

    const listData = validated.data as ListSliceData;
    const normalizedListViewType =
      listData.listViewType === "compact"
        ? "expandableTable"
        : listData.listViewType;
    return {
      status: "ready",
      sliceData: listData,
      listViewType: normalizedListViewType,
    };
  } catch (error) {
    return {
      status: "failed",
      validationErrors: [
        {
          path: "(parse)",
          message:
            error instanceof Error
              ? error.message
              : "Failed to parse AI output.",
        },
      ],
      rawAnswer,
    };
  }
}

export type { ListSliceData };
