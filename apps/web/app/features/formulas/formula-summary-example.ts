import {
  evaluateExpression,
  ExpressionEvaluationError,
  type ExpressionScope,
  type ExpressionValue,
  type FormulaDefinitionForEval,
  type FormulaResolver,
} from "@repo/hooks";

import type { FormulaDefinitionRecord } from "../../lib/api-client";

function toFormulaDefinitionForEval(
  record: Pick<FormulaDefinitionRecord, "name" | "inputs" | "body">,
): FormulaDefinitionForEval {
  return {
    name: record.name,
    inputs: record.inputs.map((input) => ({
      name: input.name,
      ...(input.required === false ? { required: false } : {}),
    })),
    body: record.body,
  };
}

function createFormulaResolverFromCatalog(
  catalog: readonly FormulaDefinitionRecord[],
): FormulaResolver {
  const byName = new Map<string, FormulaDefinitionForEval>();
  for (const record of catalog) {
    if (!record.enabled) {
      continue;
    }
    byName.set(record.name, toFormulaDefinitionForEval(record));
  }
  return {
    resolve(name: string) {
      return byName.get(name);
    },
  };
}

const NAMED_EXAMPLE_INPUTS: Readonly<Record<string, ExpressionValue>> = {
  rate: 0.12,
  quote: "EA",
  amount: 1000,
  principal: 50_000,
  ratePerPeriod: 0.01,
  periods: 12,
  termMonths: 12,
  balance: 25_000,
  count: 3,
  startIndex: 0,
  frequency: "MONTHLY",
  itemType: "LOAN",
  originationDate: "2024-01-15",
  nextDueDate: "2024-02-15",
  baseDate: "2024-01-15",
  periodIndex: 2,
  existingCount: 6,
  revolvingBalance: 1500,
  installmentSum: 500,
  loopIndex: 0,
  loopState: 48_000,
};

export function exampleValueForFormulaInput(name: string): ExpressionValue {
  if (name in NAMED_EXAMPLE_INPUTS) {
    return NAMED_EXAMPLE_INPUTS[name]!;
  }
  const lower = name.toLowerCase();
  if (lower in NAMED_EXAMPLE_INPUTS) {
    return NAMED_EXAMPLE_INPUTS[lower]!;
  }
  if (lower.includes("date")) {
    return "2024-06-15";
  }
  if (
    lower.includes("count") ||
    lower.includes("index") ||
    lower.includes("months") ||
    lower.includes("revision")
  ) {
    return 12;
  }
  if (
    lower.includes("rate") ||
    lower.includes("amount") ||
    lower.includes("balance") ||
    lower.includes("portion") ||
    lower.includes("sum")
  ) {
    return 100;
  }
  if (lower.includes("id")) {
    return "example-id";
  }
  return name;
}

export function buildFormulaExampleInputs(
  definition: Pick<FormulaDefinitionRecord, "inputs">,
): Readonly<Record<string, ExpressionValue>> {
  const inputs: Record<string, ExpressionValue> = {};
  for (const input of definition.inputs) {
    inputs[input.name] = exampleValueForFormulaInput(input.name);
  }
  return inputs;
}

function buildPreviewExpressionScope(
  definition: Pick<FormulaDefinitionRecord, "inputs">,
  catalog: readonly FormulaDefinitionRecord[],
): ExpressionScope {
  return {
    current: {
      amortizationType: "FRENCH",
      interestRate: 0.12,
      interestRateQuote: "EA",
      originalPrincipal: 50_000,
      originationDate: "2024-01-15",
      planRevision: 1,
      scheduleHorizonMonths: 12,
      termMonths: 12,
      itemType: "LOAN",
      revolvingBalance: 1500,
    },
    loaded: {
      parent: {
        amount: 4500,
        currentBalance: 48_000,
        nextDueDate: "2024-02-15",
      },
      terms: {
        originationDate: "2024-01-15",
      },
    },
    loopIndex: 0,
    loopState: 48_000,
    inputs: buildFormulaExampleInputs(definition),
    formulaResolver: createFormulaResolverFromCatalog(catalog),
    tenantId: "preview",
    now: new Date("2024-06-15T12:00:00.000Z"),
    formulaResultCache: new Map<string, ExpressionValue>(),
  };
}

export function formatFormulaExampleValue(value: ExpressionValue): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function evaluateFormulaExampleOutput(
  definition: FormulaDefinitionRecord,
  catalog: readonly FormulaDefinitionRecord[],
): { readonly output?: string; readonly error?: string } {
  try {
    const scope = buildPreviewExpressionScope(definition, catalog);
    const result = evaluateExpression(definition.body, scope);
    return { output: formatFormulaExampleValue(result) };
  } catch (error) {
    return {
      error:
        error instanceof ExpressionEvaluationError
          ? error.message
          : "Unable to evaluate example output.",
    };
  }
}
