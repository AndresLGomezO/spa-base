import { outputKeyForAggregation } from "@repo/entity-queries/browser";

export type EntityQueryAggregationEditorRow = {
  readonly id: string;
  readonly operation: "SUM" | "COUNT" | "AVG";
  readonly field: string;
};

export type EntityQueryParameterEditorRow = {
  readonly id: string;
  readonly name: string;
  readonly valueType: "dateBucket" | "scalar" | "stringList";
  readonly granularity: "day" | "month" | "year" | "";
  readonly field: string;
};

function createEditorRowId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createEmptyEntityQueryAggregationRow(): EntityQueryAggregationEditorRow {
  return {
    id: createEditorRowId("aggregation"),
    operation: "SUM",
    field: "",
  };
}

export function createEmptyEntityQueryParameterRow(): EntityQueryParameterEditorRow {
  return {
    id: createEditorRowId("parameter"),
    name: "",
    valueType: "dateBucket",
    granularity: "month",
    field: "",
  };
}

export function entityQueryAggregationsToEditorRows(
  aggregations: readonly {
    readonly operation: "SUM" | "COUNT" | "AVG";
    readonly field?: string;
  }[],
): EntityQueryAggregationEditorRow[] {
  return aggregations.map((entry) => ({
    id: createEditorRowId("aggregation"),
    operation: entry.operation,
    field: entry.field ?? "",
  }));
}

export function editorRowsToEntityQueryAggregations(
  rows: readonly EntityQueryAggregationEditorRow[],
): readonly {
  readonly operation: "SUM" | "COUNT" | "AVG";
  readonly field?: string;
}[] {
  return rows
    .filter((row) => row.operation === "COUNT" || row.field.trim().length > 0)
    .map((row) => ({
      operation: row.operation,
      ...(row.field.trim().length > 0 ? { field: row.field.trim() } : {}),
    }));
}

export function entityQueryParametersToEditorRows(
  parameters: readonly {
    readonly name: string;
    readonly valueType: "dateBucket" | "scalar" | "stringList";
    readonly granularity?: "day" | "month" | "year";
    readonly field?: string;
  }[],
): EntityQueryParameterEditorRow[] {
  return parameters.map((entry) => ({
    id: createEditorRowId("parameter"),
    name: entry.name,
    valueType: entry.valueType,
    granularity: entry.granularity ?? "",
    field: entry.field ?? "",
  }));
}

export function editorRowsToEntityQueryParameters(
  rows: readonly EntityQueryParameterEditorRow[],
): readonly {
  readonly name: string;
  readonly valueType: "dateBucket" | "scalar" | "stringList";
  readonly granularity?: "day" | "month" | "year";
  readonly field?: string;
}[] {
  return rows
    .filter((row) => row.name.trim().length > 0)
    .map((row) => ({
      name: row.name.trim(),
      valueType: row.valueType,
      ...(row.valueType === "dateBucket"
        ? {
            granularity:
              row.granularity === "" ? ("month" as const) : row.granularity,
            field: row.field.trim(),
          }
        : {}),
    }));
}

export function listEntityQueryGroupSortFieldOptions(input: {
  readonly groupBy: readonly string[];
  readonly aggregations: readonly EntityQueryAggregationEditorRow[];
}): readonly { readonly value: string; readonly label: string }[] {
  const aggregationOptions = input.aggregations.flatMap((entry) => {
    if (entry.operation === "COUNT" && entry.field.trim().length === 0) {
      return [{ value: "count", label: "count" }];
    }

    if (entry.field.trim().length === 0) {
      return [];
    }

    return [
      {
        value: outputKeyForAggregation(entry.operation, entry.field.trim()),
        label: outputKeyForAggregation(entry.operation, entry.field.trim()),
      },
    ];
  });

  return [
    ...input.groupBy.map((field) => ({ value: field, label: field })),
    ...aggregationOptions,
  ];
}
