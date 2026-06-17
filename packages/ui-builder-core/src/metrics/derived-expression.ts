import type {
  MetricDerivedExpressionToken,
  MetricDerivedKpiComponentConfig,
  MetricDerivedOperator,
  MetricDerivedTerm,
} from "../types/component.js";

export const MAX_DERIVED_METRIC_EXPRESSION_METRICS = 10;
export const MAX_DERIVED_EXPRESSION_TOKENS = 30;
export const MIN_DERIVED_METRIC_EXPRESSION_METRICS = 1;

export type DerivedExpressionError =
  | "invalidExpression"
  | "divideByZero"
  | "insufficientMetrics";

export type DerivedExpressionGrammarError =
  | "empty"
  | "unbalancedParens"
  | "missingOperand"
  | "unexpectedToken"
  | "tooManyMetrics"
  | "tooManyTokens";

const OPERATOR_PRECEDENCE: Readonly<Record<MetricDerivedOperator, number>> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
};

type AstNode =
  | { readonly type: "literal"; readonly value: number }
  | { readonly type: "metric"; readonly metricDefinitionId: string }
  | {
      readonly type: "binary";
      readonly op: MetricDerivedOperator;
      readonly left: AstNode;
      readonly right: AstNode;
    };

export function extractMetricDefinitionIds(
  expression: readonly MetricDerivedExpressionToken[],
): readonly string[] {
  const ids = new Set<string>();
  for (const token of expression) {
    if (token.type === "metric" && token.metricDefinitionId.trim().length > 0) {
      ids.add(token.metricDefinitionId.trim());
    }
  }
  return [...ids];
}

export function migrateLegacyDerivedTerms(
  terms: readonly MetricDerivedTerm[],
): MetricDerivedExpressionToken[] {
  if (terms.length === 0) {
    return [{ type: "metric", metricDefinitionId: "" }];
  }

  const expression: MetricDerivedExpressionToken[] = [];

  for (let index = 0; index < terms.length; index += 1) {
    const term = terms[index]!;
    const multiplier = term.multiplier;

    if (index > 0) {
      expression.push({ type: "operator", op: multiplier >= 0 ? "+" : "-" });
    }

    const absoluteMultiplier = Math.abs(multiplier);
    if (absoluteMultiplier === 1) {
      expression.push({
        type: "metric",
        metricDefinitionId: term.metricDefinitionId,
      });
    } else {
      expression.push({ type: "constant", value: absoluteMultiplier });
      expression.push({ type: "operator", op: "*" });
      expression.push({
        type: "metric",
        metricDefinitionId: term.metricDefinitionId,
      });
    }
  }

  return expression;
}

export function resolveMetricDerivedExpression(
  config: Pick<MetricDerivedKpiComponentConfig, "expression" | "terms">,
): readonly MetricDerivedExpressionToken[] {
  if (config.expression && config.expression.length > 0) {
    return config.expression;
  }

  if (config.terms && config.terms.length > 0) {
    return migrateLegacyDerivedTerms(config.terms);
  }

  return [{ type: "metric", metricDefinitionId: "" }];
}

export function normalizeMetricDerivedKpiConfig(
  config: MetricDerivedKpiComponentConfig,
): MetricDerivedKpiComponentConfig {
  const expression = resolveMetricDerivedExpression(config);
  return {
    kind: config.kind,
    label: config.label,
    expression,
    groupBindings: config.groupBindings,
    dimensionBindings: config.dimensionBindings,
    styles: config.styles,
  };
}

export function validateDerivedExpressionGrammar(
  tokens: readonly MetricDerivedExpressionToken[],
): DerivedExpressionGrammarError | null {
  if (tokens.length === 0) {
    return "empty";
  }

  const metricCount = tokens.filter((token) => token.type === "metric").length;
  if (metricCount > MAX_DERIVED_METRIC_EXPRESSION_METRICS) {
    return "tooManyMetrics";
  }

  if (tokens.length > MAX_DERIVED_EXPRESSION_TOKENS) {
    return "tooManyTokens";
  }

  let parenDepth = 0;
  let expectOperand = true;

  for (const token of tokens) {
    if (token.type === "paren") {
      if (token.side === "open") {
        if (!expectOperand) {
          return "unexpectedToken";
        }
        parenDepth += 1;
        continue;
      }

      if (parenDepth === 0) {
        return "unbalancedParens";
      }
      parenDepth -= 1;
      expectOperand = false;
      continue;
    }

    if (token.type === "operator") {
      if (expectOperand) {
        return "missingOperand";
      }
      expectOperand = true;
      continue;
    }

    if (!expectOperand) {
      return "unexpectedToken";
    }

    expectOperand = false;
  }

  if (expectOperand || parenDepth !== 0) {
    return expectOperand ? "missingOperand" : "unbalancedParens";
  }

  return null;
}

function toGrammarErrorCode(
  error: DerivedExpressionGrammarError | null,
): DerivedExpressionError | null {
  if (error === null || error === "tooManyMetrics") {
    return error === "tooManyMetrics" ? "invalidExpression" : null;
  }
  return "invalidExpression";
}

function parseExpression(
  tokens: readonly MetricDerivedExpressionToken[],
): AstNode | DerivedExpressionError {
  const output: AstNode[] = [];
  const operators: MetricDerivedExpressionToken[] = [];

  const flushOperators = (currentPrecedence: number) => {
    while (operators.length > 0) {
      const top = operators[operators.length - 1]!;
      if (top.type !== "operator") {
        break;
      }
      if (OPERATOR_PRECEDENCE[top.op] < currentPrecedence) {
        break;
      }
      const operatorToken = operators.pop()!;
      if (operatorToken.type !== "operator") {
        return "invalidExpression" as DerivedExpressionError;
      }
      const right = output.pop();
      const left = output.pop();
      if (!right || !left) {
        return "invalidExpression";
      }
      output.push({
        type: "binary",
        op: operatorToken.op,
        left,
        right,
      });
    }
    return null;
  };

  for (const token of tokens) {
    if (token.type === "constant") {
      output.push({ type: "literal", value: token.value });
      continue;
    }

    if (token.type === "metric") {
      output.push({
        type: "metric",
        metricDefinitionId: token.metricDefinitionId,
      });
      continue;
    }

    if (token.type === "operator") {
      const error = flushOperators(OPERATOR_PRECEDENCE[token.op]);
      if (error) {
        return error;
      }
      operators.push(token);
      continue;
    }

    if (token.side === "open") {
      operators.push(token);
      continue;
    }

    while (operators.length > 0) {
      const top = operators[operators.length - 1]!;
      if (top.type === "paren" && top.side === "open") {
        operators.pop();
        break;
      }
      if (top.type !== "operator") {
        return "invalidExpression";
      }
      operators.pop();
      const right = output.pop();
      const left = output.pop();
      if (!right || !left) {
        return "invalidExpression";
      }
      output.push({
        type: "binary",
        op: top.op,
        left,
        right,
      });
    }
  }

  const finalError = flushOperators(0);
  if (finalError) {
    return finalError;
  }

  if (operators.some((token) => token.type === "paren")) {
    return "invalidExpression";
  }

  if (output.length !== 1) {
    return "invalidExpression";
  }

  return output[0]!;
}

function evaluateAst(
  node: AstNode,
  resolveMetricValue: (metricDefinitionId: string) => number | null,
  seenMetricValue: { hasAny: boolean },
): number | DerivedExpressionError {
  if (node.type === "literal") {
    return node.value;
  }

  if (node.type === "metric") {
    const resolved = resolveMetricValue(node.metricDefinitionId);
    if (resolved !== null) {
      seenMetricValue.hasAny = true;
      return resolved;
    }
    return 0;
  }

  const left = evaluateAst(node.left, resolveMetricValue, seenMetricValue);
  if (typeof left === "string") {
    return left;
  }

  const right = evaluateAst(node.right, resolveMetricValue, seenMetricValue);
  if (typeof right === "string") {
    return right;
  }

  switch (node.op) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      if (right === 0) {
        return "divideByZero";
      }
      return left / right;
  }
}

export function evaluateDerivedExpression(input: {
  readonly tokens: readonly MetricDerivedExpressionToken[];
  readonly resolveMetricValue: (metricDefinitionId: string) => number | null;
}): { readonly value: number | null; readonly error?: DerivedExpressionError } {
  const grammarError = validateDerivedExpressionGrammar(input.tokens);
  const grammarCode = toGrammarErrorCode(grammarError);
  if (grammarCode) {
    return { value: null, error: grammarCode };
  }

  const metricIds = extractMetricDefinitionIds(input.tokens);
  if (metricIds.length === 0) {
    return { value: null, error: "insufficientMetrics" };
  }

  const parsed = parseExpression(input.tokens);
  if (typeof parsed === "string") {
    return { value: null, error: parsed };
  }

  const seenMetricValue = { hasAny: false };
  const evaluated = evaluateAst(
    parsed,
    input.resolveMetricValue,
    seenMetricValue,
  );
  if (typeof evaluated === "string") {
    return { value: null, error: evaluated };
  }

  if (!seenMetricValue.hasAny) {
    return { value: null };
  }

  if (!Number.isFinite(evaluated)) {
    return { value: null, error: "invalidExpression" };
  }

  return { value: evaluated };
}
